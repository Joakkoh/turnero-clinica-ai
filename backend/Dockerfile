FROM golang:1.23-alpine AS build
WORKDIR /src

COPY go.mod ./
COPY *.go ./
# Resolves dependencies and writes go.sum (generated at build time).
RUN go mod tidy && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server .

FROM alpine:3.20
RUN adduser -D -H app
USER app
COPY --from=build /out/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
