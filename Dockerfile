# DONT TRY TO BUILD AN ARM64 VERSION OF THIS. IT WILL FAIL.
FROM node:23-bookworm-slim

COPY package*.json ./

RUN yarn

COPY . .

EXPOSE 3000

CMD ["yarn", "start"]
