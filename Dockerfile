FROM node:6
ADD https://storage.googleapis.com/kubernetes-release/release/v1.3.3/bin/linux/amd64/kubectl /usr/bin/kubectl
COPY . /app
WORKDIR /app
RUN npm install .
CMD ["node", "index.js"]
