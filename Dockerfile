FROM node:lts-alpine AS build
ENV NODE_ENV production
WORKDIR /app
COPY ./server/package.json .
COPY ./server/yarn.lock .
RUN yarn install --frozen-lockfile --prod

FROM node:lts-alpine
RUN apk update && apk add --no-cache dumb-init curl
ENV NODE_ENV production
USER node
WORKDIR /app
COPY --chown=node:node --from=build /app/node_modules /app/node_modules
COPY --chown=node:node server/dist .
CMD ["dumb-init", "node", "./main.js"]