Machine Database
================

A machine database that stores information as flat JSON files

- [Installation](#installation)
- [API Examples](#api-examples)
- [CLI Examples](#cli-examples)
- [Methods](#methods)
- [Usage](#usage)
- [Notes](#notes)
- [Inspiration](#inspiration)
- [License](#license)

<a name="installation" />

Installation
------------

First, install [Node.JS](http://nodejs.org/).  Then:

    [sudo] npm install -g machinedb

<a name="api-examples" />

API Examples
------------

Fire up `machinedb` by running:

    $ mkdir data
    $ machinedb-server --dir data
    server started on http://localhost:9000
    127.0.0.1 - - [19/Mar/2014:01:37:26 -0400] "GET /ping HTTP/1.1" 200 - "-" "curl/7.30.0"
    127.0.0.1 - - [19/Mar/2014:01:37:28 -0400] "GET /stats HTTP/1.1" 200 246 "-" "curl/7.30.0"

This will start the HTTP server listening on `localhost` on port 9000,
and serve out of `./data`.

### GET and PUT data

First, we'll see what happens when we try to access data before we save any

    $ curl -s http://localhost:9000/nodes/ | json
    []
    $ curl -s http://localhost:9000/nodes/dave.example.com
    Not Found

`GET /nodes` returns `[]`, because there are no nodes saved yet.  Trying to access a node
by name returns a `404` because, again, nothing has been put in the database yet.

Let's put some data into the database and GET it back

    $ curl -s -XPUT --data '{"foo":"bar"}' http://localhost:9000/nodes/dave.example.com | json
    {
      "message": "saved",
      "status": "ok"
    }
    $ curl -s http://localhost:9000/nodes/dave.example.com | json
    {
      "foo": "bar"
    }

Now that the data is saved, when we `GET /nodes`, we will see the data stored in `dave.example.com`
appear as an element in the array returned.

    $ curl -s http://localhost:9000/nodes/ | json
    [
      {
        "foo": "bar",
        "name": "dave.example.com"
      }
    ]

Notice the `name` attribute has been automatically been set for us.  `machinedb` will automatically
set `name` when retrieved as `/nodes`, overwriting what may have been saved as `name`.

Let's add another node

    $ curl -s -XPUT --data '{"baz":"bat"}' http://localhost:9000/nodes/mike.example.com  | json
    {
      "message": "saved",
      "status": "ok"
    }
    $ curl -s http://localhost:9000/nodes/ | json
    [
      {
        "foo": "bar",
        "name": "dave.example.com"
      },
      {
        "baz": "bat",
        "name": "mike.example.com"
      }
    ]

Observe how the array now contains both nodes

    $ curl -s -XDELETE http://localhost:9000/nodes/dave.example.com | json
    {
      "message": "deleted",
      "status": "ok"
    }
    $ curl -s http://localhost:9000/nodes/ | json
    [
      {
        "baz": "bat",
        "name": "mike.example.com"
      }
    ]

`dave.example.com` has been removed from the array, as it has been removed from the
database.

### Stats and Health

You can hit `/ping` or `/stats` to see process health.

    $ curl localhost:9000/ping
    pong
    $ curl localhost:9000/stats | json
    {
        "arch": "x64",
        "dir": "/Users/dave/dev/machinedb/nodes",
        "machinedbversion": "v0.0.0",
        "mem": {
            "rss": 21270528,
            "heapTotal": 17603072,
            "heapUsed": 6780400
        },
        "nodeversion": "v0.10.22",
        "now": 1395207482098,
        "pid": 38784,
        "platform": "darwin",
        "started": 1395207441931
    }

<a name="cli-examples" />

CLI Examples
------------

This package comes bundled with `machinedb`: a command line tool for
interacting with the database.

Run it by itself to see all nodes

    $ machinedb
    [
      {
        "baz": "bat",
        "name": "mike.example.com"
      }
    ]

You can view a list of nodes by running it with `list`, or view a specific
node with `list`

    $ machinedb list
    mike.example.com
    $ machinedb show mike.example.com
    {
      "baz": "bat"
    }

You can create or update a node with `create` or `update`.  Because `machinedb` doesn't
support rewrite, these operations are the same.

    $ machinedb create dave.example.com <<< '{"baz": "bat"}'
    {
      "message": "saved",
      "status": "ok"
    }
    $ machinedb list
    dave.example.com
    mike.example.com

You can edit a node like

    $ machinedb edit dave.example.com
    # vim was opened... edit edit edit... <esc>:wq
    {
      "message": "saved",
      "status": "ok"
    }

And finally, delete a node with

    $ machinedb delete mike.example.com
    {
      "message": "deleted",
      "status": "ok"
    }
    $ machinedb list
    dave.example.com

<a name="methods" />

Methods
-------

### `GET /nodes`

Retrieve all nodes as an array of objects

### `GET /nodes/:node`

Retrieve a node, supports `if-none-match` with the `ETag` given.

### `HEAD /nodes/:node`

Same as `GET` without the data.

### `PUT /nodes/:node`

Put data given into the key.  The data is NOT verified, and *should* be JSON.

### `DELETE /nodes/:node`

Delete the node given.

<a name="usage" />

Usage
-----

### server

    Usage: machinedb-server [-d dir] [-h] [-H host] [-n] [-p port] [-u] [-v]

    A machine database that stores information as flat JSON files

    Options
      -d, --dir <dir>    the database directory, defaults to /Users/dave/dev/machinedb
      -h, --help         print this message and exit
      -H, --host <host>  [env MACHINEDB_HOST] the address to bind to, defaults to localhost
      -n, --no-log       [env MACHINEDB_NOLOG] disable logging, logging is enabled by default
      -p, --port <port>  [env MACHINEDB_PORT] the port to bind to, defaults to 9000
      -u, --updates      check npm for available updates
      -v, --version      print the version number and exit

### cli


    Usage: machinedb [-h] [-H host] [-p port] [-u] [-v]

    machinedb command line utility

    Examples
      machinedb                 # same as GET /nodes
      machinedb list            # list all nodes separated by newlines
      machinedb show <node>     # same as GET /nodes/<node>
      machinedb create <node>   # create a node by name <node>, reads JSON from stdin
      machinedb update <node>   # update a node by name <node>, reads JSON from stdin
      machinedb edit <node>     # edit a node by opening $EDITOR on the JSON returned by the server
      machinedb delet <node>    # remove a node

    Options
      -h, --help         print this message and exit
      -H, --host <host>  [env MACHINEDB_HOST] the address to bind to, defaults to localhost
      -p, --port <port>  [env MACHINEDB_PORT] the port to bind to, defaults to 9000
      -u, --updates      check npm for available updates
      -v, --version      print the version number and exit

<a name="notes" />

Notes
-----

- This program does no in-memory caching or expiring of data, it's built to run
on the [ZFS](http://en.wikipedia.org/wiki/ZFS) filesystem with the ARC for
caching.
- `GET /nodes` is a heavy operation as it reads *every* file from the filesystem, and
also doesn't limit the number of files it will open at a time (todo fix this)

<a name="inspiration" />

Inspiration
-----------

My tweet about the filesystem being the best nosql database.

<blockquote class="twitter-tweet" lang="en"><p>idea: chef replacement in bash, using simple bash scripts. search() by curl&#39;ing a machine database that stores JSON for each node.</p>&mdash; Dave Eddy (@bahamas10_) <a href="https://twitter.com/bahamas10_/statuses/443818952125194240">March 12, 2014</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

<a name="license" />

License
-------

MIT
