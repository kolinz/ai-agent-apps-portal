FROM ubuntu:lunar

RUN DEBIAN_FRONTEND=noninteractive apt-get update -y
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y curl gcc git make language-pack-ja fontconfig fonts-ipafont
RUN DEBIAN_FRONTEND=noninteractive fc-cache -fv
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y tzdata
RUN ln -fs /usr/share/zoneinfo/Asia/Tokyo /etc/localtime
RUN dpkg-reconfigure --frontend noninteractive tzdata
RUN DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y nginx

CMD ["nginx", "-g", "daemon off;"]