![Screenshot](https://i.imgur.com/toLsk59.jpg)

# gallerizr
Dynamically create a browseable gallery out of a directory of images and videos.

Gallerizr is a script that turns a directory of images into a simple web gallery
(example shown). It tiles the images useing Flickr's
[justified-content](http://flickr.github.io/justified-layout/) module and it
also allows browsing individual images with both mouse and keyboard navigation.
The gallery generation is fully dynamic: Just create a directory, copy images
into it and you're ready to serve a gallery.

Additionally, Gallerizr has functionality that allows link multiple galleries
into a navigable chain, ie. user can go to the next or previous gallery. This
enables sets or collections of galleries and is intended to eventually replace
[simple-gallery-2](https://github.com/borekl/simple-gallery-2).

The script is intended to run as a custom directory indexer (e. g.
`DirectoryIndex` directive in Apache).

**Note on video support**: At this moment the support for videos is rather
limited: videos always appear at the end of the gallery after any images and
they are limited to aspect ratio of 16:9.

## Installation and configuration
Gallerizr is CGI script written in perl with some client-side JavaScript to use
the layout library and handle interactivity. Following non-core perl libraries
are required along with sufficiently recent version of perl (at least 5.24):

* Path::Tiny
* Image::Size
* Mojo::Template
* Mojo::Loader

Install these modules with CPAN (run `cpan` in command-line and use cpan's
`install` command).

Following installation instructions will use Apache 2.4 for the web server.

### Copy files
Copy the `.cgi`, `.js` and `.css` files somewhere where the web server can find
them. The directory must allow execution of CGI scripts (which in turn means
mod_cgi needs to be loaded). Example with `/opt/galerizr` directory holding the
files published as `/gallerizr` on the web side:

    Alias /gallerizr /opt/gallerizr
    <Directory /opt/gallerizr>
      Options ExecCGI
      AddHandler cgi-script .cgi
      Require all granted
    </Directory>

### Configure a directory to use Gallerizr
Now you need to configure one or more directory trees to use Gallerizr as it
directory indexer. Everything under the specified directory (including itself)
will use Gallerizr as it indexer, serving the galleries. **Important**: You
have to explicitly set the `GALLERIZR_URI_BASE` variable so that the HTML
page produced by the CGI script knows where to find its JS and CSS files.
The path *must end with a slash*.

    <Directory /www/galleries>
      Options +Indexes
      DirectoryIndex /gallerizr/gallerizr.cgi
      SetEnv GALLERIZR_URI_BASE /gallerizr/
    </Directory>

## Global configuration file
Optionally, you can enable loading of global configuration file through the
`GALLERIZR_CONFIG` environment variable. If value of `load` is used, default
filename of `gallerizr.json` located in the same directory as the script is
used; any other value is taken as a filename.

The `client` section at this moment only allows specifying config for the
*justified-content* library (under `jlconfig` subkey).

The `server` section configures the generating script and at this moment two
configuration items are available:  `showDirs` and `imageFilter`. `showDir` lets
user see subdirectories in case there are no images to show; it defaults to
`false`. `imageFilter` lets you specify custom regex to select images to include
in the gallery; default is `^\.jpg$` and the example given below excludes
anything that starts with `thumb`. Please note, that the regex match is always
case-insensitive.

Example:

    {
      "server": {
        "showDirs": true,
        "imageFilter": "^(?!thumb).*\\.jpg\\z"
      },
      "client": {
        "jlconfig": {
          "boxSpacing": 5,
          "containerPadding": 10
        }
      }
    }

## Per-directory configuration
Optionally, you can put file `info.json` in the image directory. At this moment
it allows specifying title, date and gallery linking options. For example:

    {
      "title": "Trip to the mountains",
      "date": "May 2022",
      "next": "trip_spain",
      "prev": "holiday_2022",
      "exit": true
    }

The `next` and `prev` keys specify sibling directories with galleries the user
can navigate to. `exit` specifies, if the user can exit the gallery -- if this
is activated, the parent dir is navigated to (which is expected to have index
of some sort, like index.html)

### Image captions

It is possible to have image captions (but not video captions). These captions
will only show in the single-image browsing mode, not in the tiled gallery view.
Images are captioned under `captions` key in the per-directory configuration:

    {
      "captions": {
        "img_1286.jpg": "Some pretty nice mountain view",
        "img_1287.jpg": "Jane and Mary at the top of the mountain"
      }
    }

## Notes
Currently the justified-layout library is loaded from unpkg.org CDN. If you want
a local file, you need to modify the CGI script itself.

This gallery is not suitable for large amount of images in single directory; the
images need to be all scanned for their metadata and then are loaded up on a
single page in full resolution. Good for tens of images, questionable for
hundreds and likely unusable for thousands.
