#!/bin/zsh
cd "$(dirname "$0")"
exec zsh "./_patches/apply.sh"
