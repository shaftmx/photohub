FROM node:lts-alpine3.21 AS build
COPY photohub-vuetify-src /photohub-vuetify-src
RUN cd /photohub-vuetify-src/ && yarn build --outDir /photohub-vuetify --emptyOutDir

FROM python:3

RUN apt-get update && apt-get install -y gettext-base nginx && apt-get clean
RUN unlink /etc/nginx/sites-enabled/default
COPY ./requirements.txt /requirements.txt
RUN pip install -r /requirements.txt

COPY ./docker/config/nginx.conf.template /opt/
COPY ./docker/config/vhost.conf.template /opt/

COPY --from=build /photohub-vuetify /photohub-vuetify
COPY ./photohub /photohub
COPY ./docker/entrypoint /entrypoint

ENTRYPOINT ["/entrypoint"]

