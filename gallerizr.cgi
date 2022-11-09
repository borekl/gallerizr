#!/usr/bin/perl

use v5.26;
use strict;
use warnings;

use Path::Tiny qw(path cwd);
use Image::Size;
use Mojo::Template;
use Mojo::Loader qw(data_section);
use Mojo::JSON qw(decode_json encode_json);

# Mojo::Template stash
my %stash = ( items => [] );

# the directory to index; this is assembled from DOCUMENT_ROOT and REQUEST_URI
# CGI environment variables; if these are missing or empty, current directory
# is indexed instead (only useful for development)
my $dir;
if($ENV{DOCUMENT_ROOT} && $ENV{REQUEST_URI}) {
  $dir = path($ENV{DOCUMENT_ROOT})->child($ENV{REQUEST_URI});
}
$dir = cwd unless $dir && $dir->is_dir;

# attempt to read global configuration
my ($gcfg, $gcfg_file);
if($ENV{GALLERIZR_CONFIG} && $ENV{GALLERIZR_CONFIG} eq 'load') {
  $gcfg_file = cwd->child('gallerizr.json');
  $gcfg = decode_json($gcfg_file->slurp_raw) if $gcfg_file->is_file;
}

# pass along the fronted part of the config
$stash{client_config} = encode_json($gcfg->{client})
if $gcfg && exists $gcfg->{client};

# make a list of images with their sizes
push($stash{items}->@*, map {
  my ($w, $h) = imgsize($_->stringify);
  {
    path => $_,
    width => $w, height => $h,
    strg => sprintf(
      '{width:%d,height:%d,name:"%s",type:"image"}',
      $w, $h, $_->basename
    )
  }
} sort { lc($a) cmp lc($b) } $dir->children(qr/\.jpg$/));

# make a list of videos (at this moment only fixed 16:9 aspect)
push($stash{items}->@*, map {{
  width => 1920, height => 1080, path => $_,
  strg => sprintf(
    '{width:%d,height:%d,name:"%s",type:"video"}', 1920, 1080, $_->basename
  )
}} sort { lc($a) cmp lc($b) } $dir->children(qr/\.mp4$/));

# output a HTML page
print "Content-type: text/html; charset: utf-8\n\n";

my $template = $stash{items}->@* ? 'output.html.ep' : 'notfound.html.ep';
my $mt = Mojo::Template->new;
$mt->parse(data_section('main', $template));
say $mt->process(\%stash);

__DATA__

@@output.html.ep

<!doctype html>

<html class="gallery">

<head>
  <title>Gallery</title>
  <link rel="stylesheet" type="text/css" href="<%= $ENV{GALLERIZR_URI_BASE} // '' =%>gallerizr.css">
  <script>
    const images = [ <%= join(",\n", map { $_->{strg} } $_[0]->{items}->@* ) %> ];
    <% if(exists $_[0]->{client_config}) { =%>
    const config = <%= $_[0]->{client_config} %>;
    <% } =%>
  </script>
  <script src="https://unpkg.com/justified-layout@4.1.0/dist/justified-layout.min.js"></script>
  <script src="<%= $ENV{GALLERIZR_URI_BASE} // '' =%>gallerizr.js"></script>
</head>

<body>
  <div id="gallery"></div>
  <div id="browser"></div>
</body>

</html>

@@notfound.html.ep

<!doctype html>

<head>
  <title>Gallery</title>
  <link rel="stylesheet" type="text/css" href="<%= $ENV{GALLERIZR_URI_BASE} // '' %>gallerizr.css">
</head>

<body>
  <div class="notfound">
    <h1>NO IMAGES FOUND</h1>
    <p>Sorry, there are no pictures in this directory</p>
  </div>
</body>

</html>
