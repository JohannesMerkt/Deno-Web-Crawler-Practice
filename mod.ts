import args from 'https://deno.land/x/args@2.0.6/wrapper.ts';
import { EarlyExitFlag, PartialOption } from 'https://deno.land/x/args@2.0.6/flag-types.ts';
import { Integer, Text } from 'https://deno.land/x/args@2.0.6/value-types.ts';
import { PARSE_FAILURE } from 'https://deno.land/x/args@2.0.6/symbols.ts';
import * as Diff from "https://jspm.dev/diff";
import * as Colors from "https://deno.land/std@0.76.0/fmt/colors.ts";

// write a simple argument parser with options for the port and a blacklist of IPs
const parser = args
    .describe("Run a simple webserver")
    .with(EarlyExitFlag("help", { alias: ["?", "h"],describe: "Show help", exit() {
        console.log("USAGE:");
        console.log("  deno --allow-net mod.ts [options]");
        console.log(parser.help());
        return Deno.exit(0);
    }}))
    .with(PartialOption("interval", {type: Integer, alias: ["i"], describe: "time in seconds between checks", default: 30}))
    .with(PartialOption("port",{ type: Integer, alias: ['p'], describe: "Set the webserver port", default: 3000}));

// parse arguments
const runArgs = parser.parse(Deno.args);

// check if arguments where correct
if(runArgs.tag === PARSE_FAILURE) {
    console.error("Failed to parse CLI arguments");
    console.error(runArgs.error.toString());
    Deno.exit(1);
} else {
    const { port, interval } = runArgs.value;
    var previousResponse: string | undefined = undefined;

    setInterval(()=> {
        const siteContents = fetch("https://ubicomp.net/sw/task1.php");

        siteContents.then((response) => {
            return response.text();
        }).then((textData) => {
            var newResponse = htmlToMdFormat(textData);
            if(previousResponse!==undefined) {
                const diff = Diff.diffLines(previousResponse,newResponse);
                var result = "";
                var changedLines = 0;
                diff.forEach((part: any) => {
                    if(part.added || part.removed) {
                        changedLines++;
                    }
                    var lines = (part.value as string).split(" \r\n");
                    lines.pop();
                    if(part.added) {
                        lines.forEach((line: string, id: number) => {
                            lines[id] = "+ " + line;
                        });
                    } else if(part.removed) {
                        lines.forEach((line: string, id: number) => {
                            lines[id] = "- " + line;
                        });
                    } else {
                        lines.forEach((line: string, id: number) => {
                            lines[id] = "~ " + line;
                        });
                    }
                    result += lines.join(" \r\n") + "\r\n";
                });
                if(changedLines > 4) {
                    var now =  new Date()
                    const write = writeFile("./logs/" + now.toString() + ".md", result);
                    write.then(() => console.log("File written to."));
                }
            }
            previousResponse = newResponse;
        });
    }, Number(interval) * 1000);
}

// utility function to write a file
async function writeFile(path: string, text: string): Promise<void> {
    return await Deno.writeTextFile(path, text);
  }

// an html segment is either a tag or a text segment from the original html string. a tag is not yet joined with its closing/opening tag
interface HtmlSegment {
    type: string,
    opening?: Boolean,
    solo?: Boolean,
    attributes?: HtmlAttribute[],
    text?: string
}

// a html element is a object representation of a html tag with its children hierachy. it can also be a text type with the content being the text string
interface HtmlElement {
    type: string,
    content?: HtmlElement[] | string,
    attributes?: HtmlAttribute[]
}

// a html attribute belongs to a tag 
interface HtmlAttribute {
    type: string,
    value?: string
}

// parses the html and converts it to a md doc string
function htmlToMdFormat(html: string) : string {
    const parsedHtml = parseHTML(html);
    return getStringfromHtmlElements(parsedHtml);
}

// a rekursive function that generates a md doc string from a html element hierachy
function getStringfromHtmlElements(elements: HtmlElement[]) : string {
    var result: string = "";
    for(var i = 0; i < elements.length; i++) {
        const element = elements[i];
        if(element.type === "text") {
            result += (element.content as string);
        } else {
            var childrenString: string = "";
            if(element.content) {
                childrenString = getStringfromHtmlElements((element.content as HtmlElement[]));
            }
            var lines = childrenString.split(" \r\n").filter(segment => segment !== "");
            switch(element.type) {
                case "br":
                    result +=" \r\n\r\n";
                    break;
                case "h1":
                    if(element.content && element.content.length > 0) {
                        lines.forEach((line, id) => {
                            lines[id] = "# " + line;
                        });
                        result +=" \r\n";
                        result +=lines.join(" \r\n");
                        result +=" \r\n";
                    }
                    break;
                default:
                    result += childrenString;
                    break;
            }
        } 
    }
    return result;
}

// a function that parses a html string into a json hierachy
function parseHTML(html: string): HtmlElement[] {
    const firstSplit = html.split("<").filter(segment => segment !== "");
    var htmlElements: HtmlSegment[] = [];
    firstSplit.forEach((segment) => {
        var secondSplit = segment.split(">").filter(segment => segment !== "");
        secondSplit.forEach((segment2,id) => {
            htmlElements.push(getHtmlSegment(segment2,id === 0));
        });
    });
    return discoverHTMLHierachy(htmlElements);
}

// creates a html segment object from a html segment
function getHtmlSegment(segment: string, isTag: Boolean): HtmlSegment {
    if(isTag) {
        var tagOnly = segment;
        if(segment.startsWith("/")) {
            tagOnly = segment.substring(1);
        }
        if(segment.endsWith("/")) {
            tagOnly = segment.slice(0,-1);
        }
        var tagSegments = tagOnly.split(" ");
        var attributes: HtmlAttribute[] = [];
        tagOnly = tagSegments.shift()!.toLowerCase();
        tagSegments.forEach(rawAttribute => {
            var attrSplit = rawAttribute.split('="',2);
            if(attrSplit.length>1) {
                attributes.push({type: attrSplit[0], value: attrSplit[1].slice(0,-1)});
            } else {
                attributes.push({type: rawAttribute});
            }
        });
        var result: HtmlSegment = {type: tagOnly, opening: isOpeningTag(segment), solo: isSoloTag(segment)};
        if(attributes.length > 0) {
            result.attributes = attributes;
        }
        return result;
    } else {
        return {type: "text", text: segment};
    }
}

// checks if html segment tag is an opening tag
function isOpeningTag(tagString: string): Boolean {
    return !tagString.startsWith("/") && !tagString.endsWith("/");
}

// checks if html segment tag is solo and has no closing tag
function isSoloTag(tagString: string): Boolean {
    return tagString.endsWith("/") && !tagString.startsWith("/");
}

// creates a html element object from a html segment tag and its content html elements
function getHTMLTag(tag: HtmlSegment,content: HtmlElement[] | undefined = undefined): HtmlElement {
    var result: HtmlElement = { type: tag.type, attributes: tag.attributes };
    if(content !== undefined) {
        result.content = content;
    }
    return result;
}

// converts an array of html segments contianing tags and text segments into a hierachy of html elements in a rekursive way
function discoverHTMLHierachy(elements:HtmlSegment[]): HtmlElement[] {
    var remaining = elements;
    var hierachy: HtmlElement[] = [];
    while(remaining.length > 0) {
        var tag = remaining.shift();
        if(tag !== undefined) {
            if(tag.type === "text") {
                hierachy.push({type:"text",content: tag.text});
            } else if (tag.solo) {
                hierachy.push(getHTMLTag(tag));
            } else if (tag.opening) {
                // find closing tag
                var closingTagId = -1;
                for(var i = 0; i < remaining.length; i++) {
                    var candidate = remaining[i];
                    if(candidate.type !== "text" && !candidate.opening && !candidate.solo && candidate.type === tag.type){
                        // found closing tag
                        closingTagId = i;
                        break;
                    }
                }
                if(closingTagId === -1) {
                    console.log("couldnt find closing tag");
                } else {
                    var innerElements = remaining.slice(0,closingTagId);
                    hierachy.push(getHTMLTag(tag,discoverHTMLHierachy(innerElements)))
                    remaining = remaining.slice(closingTagId+1);
                }
            } else {
                console.log("Ran into closing tag with no opening tag " + tag);
            }
        } else {
            console.log("tag was undefined");
        }
    }
    return hierachy;
}