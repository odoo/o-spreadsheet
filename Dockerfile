FROM node:14-alpine

WORKDIR /o-spreadsheet

# install app dependencies
COPY package.json /o-spreadsheet/package.json
RUN npm install

COPY . /o-spreadsheet

EXPOSE 8080
EXPOSE 9000
CMD [ "npm", "run", "dev" ]
