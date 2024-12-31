image_name := 'ghcr.io/yesawoo/node-base:latest'

# Define a default recipe
default:
	echo "Please specify a recipe to run."

# Build the project for x86_64. ARM makes zeromq compile and fail violently.
build:
	#!/bin/sh

	docker buildx build \
	--platform linux/amd64 \
	-t {{ image_name }} \
	--push \
	.