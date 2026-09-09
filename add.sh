#!/bin/bash
COUNTER_FILE="counter"

# Проверяем, существует ли файл счетчика. Если нет — создаем с 0.
if [ ! -f "$COUNTER_FILE" ]; then
    echo "0" > "$COUNTER_FILE"
fi

# Читаем текущее значение, увеличиваем на 1 и сохраняем обратно
data_id=$(cat "$COUNTER_FILE")
data_id=$((data_id + 1))
echo "$data_id" > "$COUNTER_FILE"

echo "Автоматически присвоен ID: $data_id"
# Запрашиваем ввод и сохраняем его в переменную data
read -p "Какую дату передать: " data
echo "$data" > data
read -p "Какой ключ для даты: " data_key

# Расчет sha256 от переменной data_key и сохранение в key_sha256
key_sha256=$(echo -n "$data_key" | sha256sum | awk '{print $1}')

# Шифрование файла любого размера (потоковое чтение)
openssl enc -aes-256-cbc -pbkdf2 -iter 10000 -a -salt -in data -out "publ/data_crypted_$data_id" -pass "pass:$data_key"

# Удаляем временный файл с открытыми данными
rm -f data

# Поиск // hashputher и добавление новой строки после неё
sed -i "/\/\/ hashputher/a const targetHash_$data_id = \"$key_sha256\";" publ/index.js

# Поиск // pathputher и добавление новой строки после неё
sed -i "/\/\/ pathputher/a const secretFilePath_$data_id = \"data_crypted_$data_id\";" publ/index.js

# 2. Подготовка многострочного блока JS-кода
js_block="        else if (hashHex === targetHash_$data_id) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_$data_id);
            if (!response.ok) {
                throw new Error(\"fuck!\");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = \`\${fileText_decrypt}\`;
            resultDiv.style.display = \"block\";
            resultDiv.style.backgroundColor = \"#d4edda\";
        }"

# 3. Вставка кода после строки // elseifputher
sed -i "/\/\/ elseifputher/r /dev/stdin" publ/index.js <<< "$js_block"
