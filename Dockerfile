# DONT TRY TO BUILD AN ARM64 VERSION OF THIS. IT WILL FAIL.
FROM node:23-bookworm-slim

COPY package*.json ./

RUN apt-get update \
	&& apt-get install -y \
	git \
	curl \
	zip \
	unzip \
	tar \
	vim-tiny \
	&& rm -rf /var/cache/apt/archives /var/lib/apt/lists

RUN yarn

COPY . .

EXPOSE 3000

CMD ["yarn", "start"]
