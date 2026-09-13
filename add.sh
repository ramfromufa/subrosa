#!/bin/bash

# 1. Запрашиваем ввод данных и ключа
read -p "Какую дату передать: " data
read -p "Какой ключ для даты: " data_key

# 2. Расчет sha256 от переменной data_key
key_sha256=$(echo -n "$data_key" | sha256sum | awk '{print $1}')

# 3. Шифрование текста в памяти и очистка от переносов строк
secret_file_content=$(openssl enc -aes-256-cbc -pbkdf2 -iter 10000 -a -salt -pass "pass:$data_key" <<< "$data")
secret_file_content=$(echo "$secret_file_content" | tr -d '\n\r')

# Путь к файлу
file_path="publ/data.js"

# 4. Безопасная вставка в начало массива с помощью awk
# Передаем переменные через флаг -v, что полностью исключает ошибки спецсимволов
awk -v hash="$key_sha256" -v secret="$secret_file_content" '
{
    print $0
    if ($0 ~ /const cryptoDataList = \[/) {
        print "    {"
        print "        targetHash: \x27" hash "\x27,"
        print "        secretFile: \x27" secret "\x27"
        print "    },"
    }
}' "$file_path" > "${file_path}.tmp" && mv "${file_path}.tmp" "$file_path"

echo "Данные успешно добавлены наверх списка в publ/data.js!"
