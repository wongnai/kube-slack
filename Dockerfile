FROM node:8-alpine

# Don't run as root user
ENV user kube-slack
RUN addgroup -S $user && adduser -S -g $user $user

WORKDIR /app
COPY package.json /app
RUN npm install --production

COPY . /app

RUN chown -R $user:$user /app
USER $user

CMD ["node", "."]
