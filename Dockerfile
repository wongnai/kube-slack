# Build
FROM node:10-alpine AS build
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
RUN npm run build

# Run
FROM node:10-alpine
# Don't run as root user
ENV user kube-slack
RUN addgroup -S $user && adduser -S -g $user $user

WORKDIR /app
COPY package.json /app
RUN npm install --production

COPY --from=build /app/build/ /app
COPY config/ /app/config/

RUN chown -R $user:$user /app
USER $user

CMD ["node", "."]
