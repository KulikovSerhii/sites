<br><br><p align="center"><a href="https://ghost.org/#gh-light-mode-only" target="_blank"><img src="https://user-images.githubusercontent.com/65487235/157884383-1b75feb1-45d8-4430-b636-3f7e06577347.png" alt="Ghost" width="200px"></a><a href="https://ghost.org/#gh-dark-mode-only" target="_blank"><img src="https://user-images.githubusercontent.com/65487235/157849205-aa24152c-4610-4d7d-b752-3a8c4f9319e6.png" alt="Ghost" width="200px"></a></p>

<br><br>

# Запуск сайта на Ghost
В этом репозитории все самое необходимое для запуска полноценного сайта на CMS Ghost <br><br>

<br><br>

## Содержание

1. [Полезные ссылки](#полезные-ссылки)
2. [Настройка Firewall](#настройка-firewall)
    - [Настройки UFW](#настройки-ufw)
    - [Настройки iptables](#настройки-iptables)

<br><br>

## Полезные ссылки

* [Установка Docker на Ubuntu Server][01]
* [Полезные команды для работы с Docker из документации Ghost][02]

<br><br>

## Настройка Firewall

1. ### Настройки UFW
    _Docker сам настраивает iptables, поэтому UFW не влияет на контейнеры Docker_

    * #### Сбросить текущие правила UFW
      ```sh
      sudo ufw reset
      ```

    * #### Заблокировать все входящие соединения по умолчанию
      ```sh
      sudo ufw default deny incoming
      ```

    * #### Разрешить все исходящие соединения по умолчанию
        ```sh
        sudo ufw default allow outgoing
        ```

    * #### Разрешить входящие подключения на порт 2509 TCP (например это SSH)
        ```sh
        sudo ufw allow 2509/tcp
        ```

    * #### Включить UFW с применением всех вышеуказанных правил
        ```sh
        sudo ufw enable
        ```

    * #### Перезагрузить правила UFW из конфигов и применить их заново
        ```sh
        sudo ufw reload
        ```

    * #### Проверить активность и правила UFW в подробном виде
        ```sh
        sudo ufw status verbose
        ```

2. ### Настройки iptables для Docker
    * [**<u>Packet filtering and firewalls</u>**][20]

    * #### Очистить цепочку DOCKER-USER
      ```sh
      sudo iptables  -F DOCKER-USER;
      sudo ip6tables -F DOCKER-USER;
      ```

    * #### Разрешаем уже существующие соединения (исходящие из контейнера) – обязательно в самом начале!
      ```sh
      sudo iptables  -I DOCKER-USER -m state --state RELATED,ESTABLISHED -j ACCEPT;
      sudo ip6tables -I DOCKER-USER -m state --state RELATED,ESTABLISHED -j ACCEPT;
      ```

    * #### Разрешаем исходящий трафик с контейнеров на основной интерфейс, через который идёт интернет
      ```sh
      # Определяем основной сетевой интерфейс
      OUT_IF=$(ip route get 8.8.8.8 | awk '{for(i=1;i<=NF;i++){if($i=="dev"){print $(i+1)}}}');

      sudo iptables  -A DOCKER-USER -o $OUT_IF -j ACCEPT;
      sudo ip6tables -A DOCKER-USER -o $OUT_IF -j ACCEPT;
      ```

    * #### Добавляем правила в цепочку DOCKER-USER (разрешаем доступ к серверу только с IP Cloudflare из переменной CLOUDFLARE_IPS внутри файла .env)
      ```sh
      CLOUDFLARE_IPS=$(grep '^CLOUDFLARE_IPS=' .env | cut -d '"' -f2);
      for ip in $CLOUDFLARE_IPS; do
        if [[ "$ip" =~ : ]]; then
          sudo ip6tables -A DOCKER-USER -p tcp -m multiport --dports 80,443 -s $ip -j ACCEPT
          sudo ip6tables -A DOCKER-USER -p udp --dport 443 -s $ip -j ACCEPT
        else
          sudo iptables -A DOCKER-USER -p tcp -m multiport --dports 80,443 -s $ip -j ACCEPT
          sudo iptables -A DOCKER-USER -p udp --dport 443 -s $ip -j ACCEPT
        fi
      done;

      sudo iptables  -A DOCKER-USER -j DROP;
      sudo ip6tables -A DOCKER-USER -j DROP;

      # Проверяем правила цепочки DOCKER-USER
      sudo iptables  -L DOCKER-USER -n -v;
      sudo ip6tables -L DOCKER-USER -n -v;
      ```

[01]: https://docs.docker.com/engine/install/ubuntu/
[02]: https://github.com/TryGhost/ghost-docker/blob/main/help
[20]: https://docs.docker.com/engine/network/packet-filtering-firewalls/
