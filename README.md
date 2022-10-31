![Screenshot](https://i.imgur.com/toLsk59.jpg)

# gallerizr
Dynamically create a browseable gallery out of a directory of images.

Gallerizr is a script that turns a directory of images into a simple web gallery (example shown).
It tiles the images useing Flickr's [justified-content](http://flickr.github.io/justified-layout/)
module and it also allows browsing individual images. The gallery generation is fully dynamic:
Just create a directory, copy images into it and you're ready to serve a gallery.

The script is intended to run as a custom directory indexer (e. g. `DirectoryIndex`
directive in Apache).

## Installation and configuration
Gallerizr is CGI script written in perl with some client-side JavaScript to use the layout
library and handle interactivity. Following non-core perl libraries are required along with
sufficiently recent version of perl (at least 5.26):

* Path::Tiny
* Image::Size
* Mojo::Template
* Mojo::Loader

Install these modules with CPAN (run `cpan` in command-line and use cpan's `install` command).

Following installation instructions will use Apache 2.4 for the web server.

### Copy files
Copy the `.cgi`, `.js` and `.css` files somewhere where the web server can find them.
The directory must allow execution of CGI scripts (which in turn means mod_cgi needs
to be loaded). Example with `/opt/galerizr` directory holding the files published as
`/gallerizr` on the web side:

    Alias /gallerizr /opt/gallerizr
    <Directory /home/borek/dev/gallerizr>
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

## To Do
Currently, Gallerizr is functional, but very bare bones. Some features I expect to
implement eventually:

* configurability through config files
* configurability of individual galleries
* integration of videos
* directory navigation of some sorts
* linking of galleries (to allow to have collections of galleries)

## Notes
Currently the justified-layout library is loaded from unpkg.org CDN. If you want a local
file, you need to modify the CGI script itself.

This gallery is not suitable for large amount of images in single directory; the images
need to be all scanned for their metadata and then are loaded up on a single page
in full resolution. Good for tens of images, questionable for hundreds and likely unusable
for thousands.
