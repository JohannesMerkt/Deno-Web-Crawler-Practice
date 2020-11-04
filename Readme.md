# Practice Implementing a Web Server

I wanted to use Deno which is fairly new and figure out how to build a webserver with it. Its a secure javascript/typescript runtime aiming to fix all issues nodejs has. See: https://deno.land

## Running the script

Install deno from: https://deno.land/#installation 

Run the script with:

```
deno run --allow-net mod.ts
```

This script allows optional options for the port and a blacklist of IPs. For more information on them run the script with the help flag:

```
deno run --allow-net mod.ts --help
```

or here is an example too:

```
deno run --allow-net mod.ts --port 3001 --blacklist "192.168.178.1,192.168.178.44"
```