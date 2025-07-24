shopping-lists
==============

Manage simple shopping lists with a web app written in django

Screenshots
============
Index page :

![ScreenShot](https://raw.github.com/shaftmx/shopping-lists/master/screenshots/index.png)




Vue dev notes
=============

```
router.push({ path: 'home' })

// named route
router.push({ name: 'user', params: { userId: '123' } })
router.push("Login")
refresh page
    this.$router.go() 
```

Notes pour utiliser emit https://learnvue.co/articles/vue-emit-guide   https://vuejs.org/guide/components/events.html#emitting-and-listening-to-events 
Global properties https://blog.logrocket.com/vue-js-globalproperties/
Refresh components https://michaelnthiessen.com/force-re-render
How discuss with components https://dev.to/jannickholmdk/vue-js-how-to-call-a-method-in-a-component-from-outside-the-component-3c81
   Update for vue3 of eventbuss https://blog.logrocket.com/using-event-bus-vue-js-pass-data-between-components/

Utiliser dynamiquement des images differentes suivant la résolution https://developer.mozilla.org/fr/docs/Web/HTML/Element/picture

# Vue notes


directories:
    router: l'app tourne autour de ça. Permet de load des pages. Idealement layouts contenant le tag <router-view />. C'est un placeholder qui contiendra le contenu de "component"
    App.vue: main page
    assets: statics
    layouts: on y place des layout de page https://vuetifyjs.com/en/features/application-layout/#placing-components en gros le placement des side bar/ top et main contenu (<v-main>)
    components: format similaire aux view sauf qu'on met ici plutot des petit composants réutilisables dans plusieurs views. Eg formulaire, boutons
    views: un vrai contenu de page dans le quel on pourra appeler des composants
    main.js: definition de l'app 
    plugins

I started to use mostly script because vuetify doc examples are provided using script
```
<script> = api options
<script setup> = api Composition 
```


colors theme custom: src/plugins/vuetify.js https://vuetifyjs.com/en/styles/colors/
nice color theme `https://demos.creative-tim.com/vue-argon-design-system/?_ga=2.203448720.1205831527.1701116964-1649089701.1701116964#/`
ou https://daveyandkrista.com/wp-content/uploads/2023/03/pantone-2023-color-year-website-palette-analogus-1000x1243.jpg
ou https://colorhunt.co/palette/fffbf5f7efe5c3acd07743db

# Gallery css examples
https://codemyui.com/grid-style-photo-gallery/
https://codepen.io/ettrics/pen/VvxmPV
https://codepen.io/DarkoKukovec/pen/mgowGG
https://codepen.io/johandegrieck/pen/xpVdBG




#
# Install
#

Simply run docker compose

# Some notes to run local dev tests

new way to dev: just run docker compose dev. And it will create a nginx and a vue container running in debug mode.
TODO do the actual schema in ascii art

```bash
docker compose -f docker-compose.yml -f docker-compose-dev.yml up
docker compose -f docker-compose.yml -f docker-compose-dev.yml build
docker compose -f docker-compose.yml -f docker-compose-dev.yml exec web bash
# From there there is an automatic yarn build in web-vue eg yarn dev --host"

http://localhost:8080

Bootstrap url for dev 
curl http://localhost:8080/api/bootstrap


# Manual build
# docker compose -f docker-compose.yml -f docker-compose-dev.yml exec web-vue bash -c "cd /photohub-vuetify-src/ && yarn build --outDir /photohub-vuetify"
```
You can run dev both way, run docker compose dev, and use the manual build command and the shared volume.
Or use the vuejs dev server and target the docker compose url for the /api

## Manual Rebuild vuejs code (if you don't use dev container web-vue)
docker run -it -v $PWD/photohub-vuetify-src/:/photohub-vuetify-src -v /tmp/photohub-vuetify/:/photohub-vuetify  node:lts-alpine3.21 sh -c "cd /photohub-vuetify-src/ && yarn build --outDir /photohub-vuetify --emptyOutDir"

## Automatic Use vuejs dev server (if you don't use dev container web-vue)
docker run --network=host -it -v $PWD/photohub-vuetify-src/:/photohub-vuetify-src -v /tmp/photohub-vuetify/:/photohub-vuetify  node:lts-alpine3.21 sh -c "cd /photohub-vuetify-src/ && yarn dev --host"

TODO how dump the db to db-init

#
# Run local env
#

#```bash
#export DB_NAME=netwiki_shop
#export DB_HOST=127.0.0.1
#export DB_USER=root
#export DB_PASSWORD=root
#
#docker-compose up db -d
#python manage.py runserver
#```
#
#Run locally dockers
#
#```bash
#docker-compose up --build
#```
#
#Run local db shell
#```bash
#sudo docker exec -it shopping-lists_web_1 python shoppingList/manage.py dbshell
#```
#
#Creating/running db migration
#
#```bash
#python manage.py makemigrations
#python manage.py migrate
#```




#
# How the project has been init
#

  docker run -it -v $PWD:/opt/ python:3 bash
  pip install --upgrade pip
  pip3 install django
  pip freeze # -> requirements.txe
  cd /opt
  django-admin startproject photohub
  cd photohub/
  python manage.py startapp hub
  
  docker run -it -v $PWD/photohub-vuetify-src/:/photohub-vuetify-src node:lts-alpine3.21 sh
  # From https://vuetifyjs.com/en/getting-started/installation/#using-vite
  cd /tmp
  apk add rsync
  yarn create vuetify
  > project name: photohub-vuetify
  > preset: base
  > typescript: no
  > dependencies: yarn
  yarn add pinia
  rsync -av /tmp/photohub-vuetify/ /photohub-vuetify-src/


# Note / Vue and Django UPGRADES

## Django
https://docs.djangoproject.com/fr/5.1/howto/upgrade-version/
Django in requirements.txt
it it with
  docker compose -f docker-compose.yml -f docker-compose-dev.yml build
  docker  run  -it shaftmx/photohub bash
  pip3 freeze | grep Django
  pip3 install --upgrade Django

## Node
version in Dockerfile image node
  vim Dockerfile

  rsync -av ./ back-before-upgrade/

  # From https://vuetifyjs.com/en/getting-started/upgrade-guide/#setup
  docker run -it -v $PWD/photohub-vuetify-src/:/photohub-vuetify-src node:lts-alpine3.21 sh
  cd /tmp
  apk add rsync
  rsync -av /photohub-vuetify-src/ /tmp/photohub-vuetify/
  cd /tmp/photohub-vuetify/
  yarn upgrade
  yarn upgrade --latest
  rsync -av /tmp/photohub-vuetify/ /photohub-vuetify-src/






# App errors
Login failure
SyntaxError: Unexpected token '<', " <!DOCTYPE "... is not valid JSON

Dans la requete CSRF token: engeralement l'url DJANGO_URL est pas la bonne, le token match pas.



Si on souahite que les images soient privé avec check d'accès via django
Potentially use https://www.djangosnippets.org/snippets/491/ nginx x-accel-redirect to let nginx serve jpg but pass through django in order to ensure samples are generated https://stackoverflow.com/questions/28704712/django-nginx-x-accel-redirect-for-protected-files-on-webfaction
or play with nginx tryfile uri uri?reample uri (again)


Manually handle upload
# handle_uploaded_file(request.FILES["file"])






# def handle_uploaded_file(f):
#     with open("some/file/name.txt", "wb+") as destination:
#         for chunk in f.chunks():
#             destination.write(chunk)



# Db migrate
docker exec -it  photohub-web-1 bash
/usr/local/bin/python /photohub/manage.py makemigrations
/usr/local/bin/python /photohub/manage.py makemigrations --update
/usr/local/bin/python /photohub/manage.py migrate
/usr/local/bin/python /photohub/manage.py inspectdb

apt-get install mariadb-client
/usr/local/bin/python /photohub/manage.py dbshell
 show tables;
 /usr/local/bin/python /photohub/manage.py flush

show create table hub_tag;

# To reset everything just rm all migrations/* migration files



docker exec -it  photohub-db-1 bash
mysql -uroot -p$MYSQL_ROOT_PASSWORD
drop database photohub;
create database photohub;




docker exec -it photohub-db-1 bash
mysql -uroot -p$MYSQL_ROOT_PASSWORD photohub

delete from hub_exif;
delete from hub_photo;
select * from hub_photo;

TODO troubleshoot url filter mode and tags login when change seems to empty
TODO photo ajouter le origin_filename lors de l'upload
TODO changer le favico de l'app
TODO afficher la description des tag groups et tags ?
TODO keep url query parameters at login page and login redirects
TODO : Implement admin URL resample missing. And force all resample

TODO finish all photo view (search)
TODO Photo display display metadata
TODO review smart search
TODO create view/modify
TODO favorite/moodboard
TODO enable reoardering photos
TODO: modify photo tags and metadata
https://miro.com/app/board/uXjVNHqVRfk=/

# Link of alternatives

https://github.com/LycheeOrg/Lychee : tags pas ouf et fonctionnement en album
https://fr.piwigo.org/
https://github.com/immich-app/immich/tree/main
https://meichthys.github.io/foss_photo_libraries/
https://github.com/LibrePhotos/librephotos	
https://github.com/photoprism/photoprism

