#!/usr/bin/perl

use strict;
use warnings;

use Path::Tiny qw(path cwd);
use Image::Size;
use Mojo::Template;
use Mojo::Loader qw(data_section);
use Mojo::JSON qw(decode_json to_json);

binmode(STDOUT, ':utf8');

# Mojo::Template stash
my %stash = (
  items => [],
  gallery_title => 'Gallery',
);

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
if($ENV{GALLERIZR_CONFIG}) {
  $gcfg_file = cwd->child('gallerizr.json');
  $gcfg_file = path($ENV{GALLERIZR_CONFIG}) unless $ENV{GALLERIZR_CONFIG} eq 'load';
  $gcfg = decode_json($gcfg_file->slurp_raw) if $gcfg_file->is_file;
}

# store the fronted part of the config in template stash
$stash{client_config} = to_json($gcfg->{client})
if $gcfg && exists $gcfg->{client};

# load directory-specific data/config, if it exists
my $lcfg_file = $dir->child('info.json');
my $lcfg = decode_json($lcfg_file->slurp_raw) if $lcfg_file->is_file;
$stash{dirinfo} = to_json($lcfg);
$stash{gallery_title} = $lcfg->{title} if exists $lcfg->{title};

# make a list of images with their sizes
my $custom_filter = $gcfg->{server}{imageFilter} // undef;
my $filter = $custom_filter ? qr/$custom_filter/i : qr/\.jpg$/i;
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
} sort { lc($a) cmp lc($b) } $dir->children($filter));

# make a list of videos (at this moment only fixed 16:9 aspect)
push($stash{items}->@*, map {{
  width => 1920, height => 1080, path => $_,
  strg => sprintf(
    '{width:%d,height:%d,name:"%s",type:"video"}', 1920, 1080, $_->basename
  )
}} sort { lc($a) cmp lc($b) } $dir->children(qr/\.mp4$/i));

# if no displayable items are found and the option is enabled in configuration,
# scan for directories, which will be then shown to the client for navigation
if(!$stash{items}->@* && $gcfg && $gcfg->{server}{showDirs}) {
  my @dirs = grep {
    $_ !~ /^\./
  } map {
    $_->basename
  } grep {
    $_->is_dir
  } $dir->children;
  $stash{dirs} = \@dirs if @dirs;
}

# output a HTML page
print "Content-type: text/html; charset: utf-8\n\n";

my $template = $stash{items}->@* ? 'output.html.ep' : 'notfound.html.ep';
my $mt = Mojo::Template->new;
$mt->parse(data_section('main', $template));
print $mt->process(\%stash), "\n";

__DATA__

@@output.html.ep

<!doctype html>

<html class="gallery">

<head>
  <title><%= $_[0]->{gallery_title} %></title>
  <link rel="stylesheet" type="text/css" href="<%= $ENV{GALLERIZR_URI_BASE} // '' =%>gallerizr.css">
  <script>
    const images = [ <%= join(",\n", map { $_->{strg} } $_[0]->{items}->@* ) %> ];
    <% if(exists $_[0]->{client_config}) { =%>
    const config = <%= $_[0]->{client_config} %>;
    <% } =%>
    <% if(exists $_[0]->{dirinfo}) { =%>
    const dirinfo = <%= $_[0]->{dirinfo} %>;
    <% } =%>
  </script>
  <script src="https://unpkg.com/justified-layout@4.1.0/dist/justified-layout.min.js"></script>
  <script src="<%= $ENV{GALLERIZR_URI_BASE} // '' =%>gallerizr.js"></script>
</head>


<body>

  <svg xmlns="http://www.w3.org/2000/svg" class="hidden">
    <symbol viewBox="0 0 500 500" id="icon-close">
      <g>
        <path d="M301.492,347.177h-91.361c-7.614,0-14.084,2.662-19.414,7.994c-5.33,5.331-7.992,11.8-7.992,19.41v54.823
          c0,7.611,2.662,14.089,7.992,19.417c5.327,5.328,11.8,7.987,19.414,7.987h91.361c7.618,0,14.086-2.662,19.418-7.987
          c5.325-5.331,7.994-11.806,7.994-19.417v-54.823c0-7.61-2.662-14.085-7.994-19.41S309.11,347.177,301.492,347.177z"/>
        <path d="M118.771,347.177H27.406c-7.611,0-14.084,2.662-19.414,7.994C2.663,360.502,0,366.974,0,374.585v54.826
          c0,7.61,2.663,14.086,7.992,19.41c5.33,5.332,11.803,7.991,19.414,7.991h91.365c7.611,0,14.084-2.663,19.414-7.991
          c5.33-5.324,7.992-11.8,7.992-19.41v-54.826c0-7.611-2.662-14.083-7.992-19.411S126.382,347.177,118.771,347.177z"/>
        <path d="M118.771,54.814H27.406c-7.611,0-14.084,2.663-19.414,7.993C2.663,68.137,0,74.61,0,82.221v54.821
          c0,7.616,2.663,14.091,7.992,19.417c5.33,5.327,11.803,7.994,19.414,7.994h91.365c7.611,0,14.084-2.667,19.414-7.994
          s7.992-11.798,7.992-19.414V82.225c0-7.611-2.662-14.084-7.992-19.417C132.855,57.48,126.382,54.814,118.771,54.814z"/>
        <path d="M301.492,200.999h-91.361c-7.614,0-14.084,2.664-19.414,7.994s-7.992,11.798-7.992,19.414v54.823
          c0,7.61,2.662,14.078,7.992,19.406c5.327,5.329,11.8,7.994,19.414,7.994h91.361c7.618,0,14.086-2.665,19.418-7.994
          c5.325-5.328,7.994-11.796,7.994-19.406v-54.823c0-7.616-2.662-14.087-7.994-19.414S309.11,200.999,301.492,200.999z"/>
        <path d="M118.771,200.999H27.406c-7.611,0-14.084,2.664-19.414,7.994C2.663,214.32,0,220.791,0,228.407v54.823
          c0,7.61,2.663,14.078,7.992,19.406c5.33,5.329,11.803,7.994,19.414,7.994h91.365c7.611,0,14.084-2.665,19.414-7.994
          c5.33-5.328,7.992-11.796,7.992-19.406v-54.823c0-7.616-2.662-14.087-7.992-19.414S126.382,200.999,118.771,200.999z"/>
        <path d="M503.632,62.811c-5.332-5.327-11.8-7.993-19.41-7.993h-91.365c-7.61,0-14.086,2.663-19.417,7.993
          c-5.325,5.33-7.987,11.803-7.987,19.414v54.821c0,7.616,2.662,14.083,7.987,19.414c5.331,5.327,11.807,7.994,19.417,7.994h91.365
          c7.61,0,14.078-2.667,19.41-7.994s7.994-11.798,7.994-19.414V82.225C511.626,74.613,508.964,68.141,503.632,62.811z"/>
        <path d="M301.492,54.818h-91.361c-7.614,0-14.084,2.663-19.414,7.993s-7.992,11.803-7.992,19.414v54.821
          c0,7.616,2.662,14.083,7.992,19.414c5.327,5.327,11.8,7.994,19.414,7.994h91.361c7.618,0,14.086-2.664,19.418-7.994
          c5.325-5.327,7.994-11.798,7.994-19.414V82.225c0-7.611-2.662-14.084-7.994-19.414C315.578,57.484,309.11,54.818,301.492,54.818z"
          />
        <path d="M484.222,200.999h-91.365c-7.61,0-14.086,2.664-19.417,7.994c-5.325,5.33-7.987,11.798-7.987,19.414v54.823
          c0,7.61,2.662,14.078,7.987,19.406c5.331,5.329,11.807,7.994,19.417,7.994h91.365c7.61,0,14.085-2.665,19.41-7.994
          c5.332-5.328,7.994-11.796,7.994-19.406v-54.823c0-7.616-2.662-14.087-7.994-19.414
          C498.3,203.663,491.833,200.999,484.222,200.999z"/>
        <path d="M484.222,347.177h-91.365c-7.61,0-14.086,2.662-19.417,7.994c-5.325,5.331-7.987,11.8-7.987,19.41v54.823
          c0,7.611,2.662,14.089,7.987,19.417c5.331,5.328,11.807,7.987,19.417,7.987h91.365c7.61,0,14.085-2.662,19.41-7.987
          c5.332-5.331,7.994-11.806,7.994-19.417v-54.823c0-7.61-2.662-14.085-7.994-19.41S491.833,347.177,484.222,347.177z"/>
      </g>
    </symbol>

    <symbol viewBox="0 -20 500 500" x="0px" y="0px" id="icon-left">
      <path d="M213.13,222.409L351.88,83.653c7.05-7.043,10.567-15.657,10.567-25.841c0-10.183-3.518-18.793-10.567-25.835
        l-21.409-21.416C323.432,3.521,314.817,0,304.637,0s-18.791,3.521-25.841,10.561L92.649,196.425
        c-7.044,7.043-10.566,15.656-10.566,25.841s3.521,18.791,10.566,25.837l186.146,185.864c7.05,7.043,15.66,10.564,25.841,10.564
        s18.795-3.521,25.834-10.564l21.409-21.412c7.05-7.039,10.567-15.604,10.567-25.697c0-10.085-3.518-18.746-10.567-25.978
        L213.13,222.409z"/>
    </symbol>

    <symbol viewBox="0 -20 500 500" id="icon-right">
      <path d="M352.025,196.712L165.884,10.848C159.029,3.615,150.469,0,140.187,0c-10.282,0-18.842,3.619-25.697,10.848L92.792,32.264
        c-7.044,7.043-10.566,15.604-10.566,25.692c0,9.897,3.521,18.56,10.566,25.981l138.753,138.473L92.786,361.168
        c-7.042,7.043-10.564,15.604-10.564,25.693c0,9.896,3.521,18.562,10.564,25.98l21.7,21.413
        c7.043,7.043,15.612,10.564,25.697,10.564c10.089,0,18.656-3.521,25.697-10.564l186.145-185.864
        c7.046-7.423,10.571-16.084,10.571-25.981C362.597,212.321,359.071,203.755,352.025,196.712z"/>
    </symbol>
  </svg>

  <header>
    <div id="title"></div>
    <nav>
      <button class="nav-button" id="nav-prev"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17">
        <use xlink:href="#icon-left" />
      </svg></button>
      <button class="nav-button" id="nav-exit"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17">
        <use xlink:href="#icon-close" />
      </svg></button>
      <button class="nav-button" id="nav-next"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17">
        <use xlink:href="#icon-right" />
      </svg></button>
    </nav>
  </header>

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
    <% if(exists $_[0]->{dirs} && $_[0]->{dirs}->@*) { =%>
    <p class="dirs">
    <% foreach ($_[0]->{dirs}->@*) { =%>
      <a class="dirs" href="<%= "$_/" %>"><%= $_ %></a><br>
    <% } =%>
    </p>
    <% } =%>
  </div>
</body>

</html>
