<br>

<p align="center">
  <a href="https://ghost.org/#gh-light-mode-only" target="_blank">
    <img src="https://user-images.githubusercontent.com/65487235/157884383-1b75feb1-45d8-4430-b636-3f7e06577347.png" alt="Ghost" width="200px">
  </a>
  <a href="https://ghost.org/#gh-dark-mode-only" target="_blank">
    <img src="https://user-images.githubusercontent.com/65487235/157849205-aa24152c-4610-4d7d-b752-3a8c4f9319e6.png" alt="Ghost" width="200px">
  </a>
</p>

<br>

# Запуск сайта на Ghost
В этом репозитории все самое необходимое для запуска полноценного сайта на CMS Ghost

<br>

## Содержание

1. [Полезные ссылки](#полезные-ссылки)
2. [Настройка Firewall](#настройка-firewall)
    - [Настройки UFW](#настройки-ufw)
    - [Настройки iptables](#настройки-iptables)

## Полезные ссылки

  * [Установка Docker на Ubuntu Server][01]
  * [Полезные команды для работы с Docker из документации Ghost][02]

## Настройка Firewall

  1. #### Настройки UFW
      _Docker сам настраивает iptables, поэтому UFW не влияет на контейнеры Docker_

      * #### Сбросить текущие правила UFW
        

```bash
sudo ufw reset
```

```shell
sudo ufw reset
```

          ```shell
          sudo ufw reset
          ```

```js
let text = "пример кода";
console.log(text);
```

      * #### Заблокировать все входящие соединения по умолчанию
        - `sudo ufw default deny incoming`

      * #### Разрешить все исходящие соединения по умолчанию
        - `sudo ufw default allow outgoing`

      * #### Разрешить входящие подключения на порт 2509 TCP (SSH)
        - `sudo ufw allow 2509/tcp`

      * #### Включить UFW с применением всех вышеуказанных правил
        - `sudo ufw enable`

      * #### Перечитывает правила UFW из конфигов и применяет их заново
        - `sudo ufw reload`

      * #### Проверить активность и правила UFW в подробном виде
        - `sudo ufw status verbose`

  2. #### Настройки iptables

[01]: https://docs.docker.com/engine/install/ubuntu/
[02]: https://github.com/TryGhost/ghost-docker/blob/main/help
