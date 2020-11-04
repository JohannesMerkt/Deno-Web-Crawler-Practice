# Practice Implementing a basic Web Crawler

I wanted to use Deno which is fairly new. Its a secure javascript/typescript runtime aiming to fix all issues nodejs has. See: https://deno.land

## Running the script

Install deno from: https://deno.land/#installation 

Run the script with:

```
deno run --allow-net mod.ts
```

This script allows optional options for the interval in seconds of website checks and the url to crawl. For more information on them run the script with the help flag:

```
deno run --allow-net mod.ts --help
```

or here is an example too:

```
deno run --allow-net mod.ts --interval 30 --url "https://ubicomp.net/sw/task1.php"
```