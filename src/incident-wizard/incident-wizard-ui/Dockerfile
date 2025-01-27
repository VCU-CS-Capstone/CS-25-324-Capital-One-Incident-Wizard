# Stage 1: Build the React app
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your frontend code
COPY . .

# Build the app for production
RUN npm run build

# Stage 2: Serve the compiled build with a lightweight web server
FROM nginx:alpine

# Copy build output to /usr/share/nginx/html (default NGINX serving path)
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# By default, NGINX starts and listens on port 80
CMD ["nginx", "-g", "daemon off;"]

FROM nginx:alpine

# Copy React build output to NGINX's default serving directory
COPY --from=build /app/build /usr/share/nginx/html

# Add custom NGINX configuration for React routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]