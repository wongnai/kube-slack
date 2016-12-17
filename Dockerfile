FROM node:6-alpine

# Install latest kubectl
RUN apk add --no-cache curl \
  && curl -o /usr/bin/kubectl -L https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl \
  && chmod +x /usr/bin/kubectl \
  && apk del curl

# Don't run as root user
ENV user kube-slack
RUN addgroup -S $user && adduser -S -g $user $user

WORKDIR /app
COPY package.json /app
RUN npm install --production

COPY . /app

RUN chown -R $user:$user /app
USER $user

CMD ["node", "index.js"]
