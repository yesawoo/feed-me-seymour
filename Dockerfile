# This app depends on ZeroMQ which is kind of tricky to build sometimes. 
# This creates a base image with all the stuff needed to build ZeroMQ and then
# deletes the apt cache goop.
# FROM node:23-bookworm-slim AS fms-base

FROM registry.digitalocean.com/da-pawsitory/yes-awoo/node-base
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
