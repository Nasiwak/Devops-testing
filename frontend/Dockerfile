FROM node:20

WORKDIR /app
COPY . .

RUN npm install
RUN npm install -g vite
RUN npm run build

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

