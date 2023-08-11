#!/usr/bin/env perl

# script for generating index of galleries; this scans either current or
# user-supplied directory for subdirectories, checking if they contain
# 'info.json' file; the list of directories with some additional info is then
# saved into 'gset.json', which can then be used by custom frontend code

use warnings;
use strict;
use feature qw(say);

use Path::Tiny qw(path cwd);
use Mojo::JSON qw(decode_json encode_json true);

# variables
my (@dirs, %dirinfo);
my $total_images = 0;
my $total_videos = 0;

# directory to be processed, either supplied on the commandline or current
# directory if none
my $p = path($ARGV[0] // cwd);
say 'Base path is ', $p;

# iterate over directories
my $iter = $p->iterator;
while (my $r = $iter->()) {
  my %data;

  # skip anything that isn't a directory with info.json in it
  next unless $r->is_dir;
  my $info_file = $r->child('info.json');
  next unless $info_file->is_file;
  my $dir = $r->basename;
  push(@dirs, $dir);

  # read and parse the file
  my $info = decode_json($info_file->slurp_raw);
  $data{title} = $info->{title} // $dir;
  $data{date} = $info->{date} // undef;

  # get number of images/videos
  $data{images} = $r->children(qr/^(?!thumb).*\.jpg\z/i);
  $data{videos} = $r->children(qr/\.mp4\z/i);
  $total_images += $data{images} // 0;
  $total_videos += $data{videos} // 0;

  # thumbnails
  $data{thumb}{src} = "$dir/thumb.2x.jpg";
  $data{thumb}{srcset} = "$dir/thumb.1x.jpg 1x, $dir/thumb.2x.jpg 2x";

  # save data
  $dirinfo{$dir} = \%data;
}

# print report
printf("Processed %d directories\n", scalar(@dirs));
printf("Found %d images and %d videos\n", $total_images, $total_videos);

# sort the directories
@dirs = sort { $b cmp $a } @dirs;

# save gset
$p->child('gset.json')->spew_raw(
  encode_json({
    "dirs_order" => \@dirs,
    "dirs" => \%dirinfo
  })
);
say 'Saved global gset';

# iterate over every directory and set chaining fields
my $prev;
foreach my $dir (@dirs) {
  # chaining links
  if(defined $prev) {
    $dirinfo{$prev}{prev} = $dir;
    $dirinfo{$dir}{next} = $prev;
  }
  $prev = $dir;
}

# update individual info.json
foreach my $dir (@dirs) {
  my $info_file = $p->child($dir)->child('info.json');
  my $info = decode_json($info_file->slurp_raw);

  # exit always enabled
  if(!$info->{exit}) { $info->{exit} = true; }

  if($dirinfo{$dir}{next}) {
    $info->{next} = $dirinfo{$dir}{next};
  } else {
    delete $info->{next};
  }
  if($dirinfo{$dir}{prev}) {
    $info->{prev} = $dirinfo{$dir}{prev};
  } else {
    delete $info->{prev}
  }

  # save modified info.json
  $info_file->spew_raw(encode_json($info));
}
