#!/usr/bin/env bash

set -e
set -u

echo "install xcode command line tools if needed"
pathXCodeCommandLineTools=$(xcode-select -p 2>&1)
if ["$pathXCodeCommandLineTools" != "/Library/Developer/CommandLineTools"]; then
  echo "xcode-select --install"
  xcode-select --install
  read -p "Installing XCode Command Line Tools..."
fi
echo "install rosetta"
echo "softwareupdate --install-rosetta"
softwareupdate --install-rosetta
echo "install nix if needed"
if ! command -v /run/current-system/sw/bin/nix 2>&1 >/dev/null; then
  curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install --no-confirm
fi
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
echo "clone dotfiles"
nix-shell -p git --run "git clone https://github.com/mikanIchinose/dotfiles.git ~/dotfiles"
read -p "Setup nix-darwin...(Press Enter!)"
echo "nix run nix-darwin -- switch --flake ~/dotfiles#mikan"
nix run nix-darwin -- switch --flake ~/dotfiles#mikan
read -p "Setup dotfiles...(Press Enter!)"
echo "link dotfiles"
/run/current-system/sw/bin/go install github.com/rhysd/dotfiles@latest
~/go/bin/dotfiles link ~/dotfiles
echo "gh auth login"
/run/current-system/sw/bin/gh auth login
