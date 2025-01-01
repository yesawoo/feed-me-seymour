image_name := 'ghcr.io/yesawoo/node-base:latest'

# Define a default recipe
default:
    echo "Please specify a recipe to run."

# Build the project for x86_64. ARM makes zeromq compile and fail violently.
push:
    #!/bin/sh

    docker buildx build \
    --platform linux/amd64 \
    -t {{ image_name }} \
    --push \
    .

build:
    #!/bin/sh

    docker buildx build \
    --platform linux/amd64 \
    -t {{ image_name }} \
    --load \
    .

shell: build
    docker run -it --rm {{ image_name }} /bin/bash
