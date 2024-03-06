### STAGE 1: Build ###

# Use a specific version of Node.js
FROM node:14-alpine as builder

# Install Ionic and Cordova globally
RUN npm install -g ionic cordova@8.0.0

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker layer caching
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Create a directory for the build output
RUN mkdir -p ./www

# Add the browser platform and build the Ionic application
RUN ionic cordova platform add browser@latest && \
    ionic cordova build browser

### STAGE 2: Setup ###

# Use a specific version of Nginx
FROM nginx:1.21-alpine

# Copy the default Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Remove the default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy the built files from the builder stage
COPY --from=builder /app/platforms/browser/www/ /usr/share/nginx/html
COPY --from=builder /app/src/chat-config-template.json /usr/share/nginx/html
COPY --from=builder /app/src/firebase-messaging-sw-template.js /usr/share/nginx/html

# Set the working directory
WORKDIR /usr/share/nginx/html

# Print a message indicating the application has started
RUN echo "Chat21 Ionic Started!!"

# Use envsubst to replace environment variables in files and start Nginx
CMD ["/bin/sh",  "-c",  "envsubst < /usr/share/nginx/html/chat-config-template.json > /usr/share/nginx/html/chat-config.json && envsubst < /usr/share/nginx/html/firebase-messaging-sw-template.js > /usr/share/nginx/html/firebase-messaging-sw.js && exec nginx -g 'daemon off;'"]
