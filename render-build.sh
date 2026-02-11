#!/usr/bin/env bash
# Install ffmpeg
apt-get update && apt-get install -y ffmpeg

# Install npm dependencies and build
npm ci
npm run build
