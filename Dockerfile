# This app depends on ZeroMQ which is kind of tricky to build sometimes. 
# This creates a base image with all the stuff needed to build ZeroMQ and then
# deletes the apt cache goop.
FROM node:23-bookworm-slim AS fms-base

WORKDIR /usr/src/app

# Required to build zeromq 
ENV VCPKG_FORCE_SYSTEM_BINARIES=1
RUN apt-get update \
	&& apt-get install -y \
	build-essential \
	cmake \
	libzmq3-dev \
	ninja-build \
	pkg-config \
	git \
	curl \
	zip \
	unzip \
	tar \
	vim-tiny \
	&& rm -rf /var/cache/apt/archives /var/lib/apt/lists
ENV VCPKG_FORCE_SYSTEM_BINARIES=

# Uncomment this to debug zeromq build failures without having to wait for all 
# the app stuff.
# RUN yarn add zeromq

FROM fms-base
# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN yarn

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["yarn", "start"]