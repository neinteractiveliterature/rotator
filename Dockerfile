FROM node:22-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN corepack enable && yarn install

FROM node:22-alpine AS production-dependencies-env
COPY ./package.json yarn.lock /app/
WORKDIR /app
RUN corepack enable && yarn install

FROM node:22-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/.yarn /app/.yarn
WORKDIR /app
RUN corepack enable && yarn install
RUN yarn run build

FROM node:22-alpine
COPY ./package.json yarn.lock drizzle.config.ts drizzle /app/
COPY --from=production-dependencies-env /app/.yarn /app/.yarn
COPY --from=build-env /app/build /app/build
WORKDIR /app
RUN corepack enable && yarn install
CMD ["yarn", "run", "start"]
