# Use the official Node.js image as the base image
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
	&& rm -rf /var/cache/apt/archives /var/lib/apt/lists
ENV VCPKG_FORCE_SYSTEM_BINARIES=

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