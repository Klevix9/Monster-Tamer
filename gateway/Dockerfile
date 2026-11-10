FROM nginxinc/nginx-unprivileged:1.30.6-alpine3.24

# Replace the default site with our gateway config.
COPY gateway.conf /etc/nginx/conf.d/default.conf

EXPOSE 8443
