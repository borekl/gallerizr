#!/usr/bin/perl

use v5.26;
use strict;
use warnings;

use Path::Tiny qw(path cwd);
use Image::Size;
use Mojo::Template;
use Mojo::Loader qw(data_section);

# the directory to index; this is assembled from DOCUMENT_ROOT and REQUEST_URI
# CGI environment variables; if these are missing or empty, current directory
# is indexed instead (only useful for development)
my $dir;
if($ENV{DOCUMENT_ROOT} && $ENV{REQUEST_URI}) {
  $dir = path($ENV{DOCUMENT_ROOT})->child($ENV{REQUEST_URI});
}
$dir = cwd unless $dir && $dir->is_dir;

# make a list of images with their sizes
my @images = map {
  my ($w, $h) = imgsize($_->stringify);
  {
    path => $_,
    width => $w, height => $h,
    strg => sprintf(
      '{width:%d,height:%d,name:"%s"}',
      $w, $h, $_->basename
    )
  }
} sort { lc($a) cmp lc($b) } $dir->children(qr/\.jpg$/);

# output a HTML page
print "Content-type: text/html; charset: utf-8\n\n";

my $mt = Mojo::Template->new;
$mt->parse(data_section('main', 'output.html.ep'));
say $mt->process(@images);

__DATA__

@@output.html.ep

<!doctype html>

<html>

<head>
  <title>Gallery</title>
  <% if($ENV{GALLERIZR_URI_BASE}) { =%>
  <base href="<%= $ENV{GALLERIZR_URI_BASE} =%>">
  <% } =%>
  <link rel="stylesheet" type="text/css" href="gallerizr.css">
  <script>
    const images = [ <%= join(",\n", map { $_->{strg} } @_) %> ];
  </script>
  <script src="https://unpkg.com/justified-layout@4.1.0/dist/justified-layout.min.js"></script>
  <script src="gallerizr.js"></script>
</head>

<body>
  <div id="gallery"></div>
  <div id="browser"></div>
</body>

</html>
