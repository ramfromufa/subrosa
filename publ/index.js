// Да-да, этот код  жутко неоптимизирован.
// Я бы написал его гораздо лучше, короче и проще, даже являясь чайником Джава(Ява)Скрипта.
// Это всё один большой глиняный костыль на костыле костылем погоняет. Рекурсия ёбт.

// hashputher
const targetHash_26 = "ea95ae89f90d3e924f30ca9e5523b4dc19bf38de02a2dc24f5578b489990da6a";
const targetHash_23 = "e5481aa7df58a36f4d0a1fb99cb56e3cf20e1ea96329e414c81d0ce7ad2c1bfc";
const targetHash_22 = "7c1c2745ec0ebb049fcc29e39d81909f3e5a55b88dcb43d491476fe6bb92b196";
const targetHash_21 = "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9";
const targetHash_19 = "c46314532de2d55ffacb9d58054144cf46296356889a3484b2bf9eb4339ab673";
const targetHash_18 = "c46314532de2d55ffacb9d58054144cf46296356889a3484b2bf9eb4339ab673";
const targetHash_17 = "e87a8cd5ba94b679fe93d5a1bf130cffc08ccf37e77a6fae8739244bc0ab869e";
const targetHash_16 = "c5d80b6f1327e2dcf1fcc8067b10c9a7bfd1d134a16cef0a28515b45f0eb298d";
const targetHash_15 = "c5d80b6f1327e2dcf1fcc8067b10c9a7bfd1d134a16cef0a28515b45f0eb298d";
const targetHash_14 = "feecf4f58f2524e3410b7189d1b5a4dfa9b7f775f490ece6c8496a182a5bcf64";
const targetHash_13 = "497e13b1e755b739b3287c8ce3f368ee8a5a578b8ddcbc4474c5fbf36289c970";
const targetHash_12 = "dd6113fb9195f257e29858b77eba874594f776784d2be738f0890b3c383e3070";
const targetHash_11 = "dd6113fb9195f257e29858b77eba874594f776784d2be738f0890b3c383e3070";
const targetHash_10 = "75670b2800c1c1b7633785f0d9eb00f274ad825603290a85579b56741f6a6c86";
const targetHash_9 = "f21d8cf3a4b7f246c9334ca43e026703862bcca599858168ff5362c111990700";
const targetHash_8 = "accfbfa536c22e42f080cd5f25b15ee2d9609656f3213617cb79c43898f75a24";
const targetHash_7 = "5257e8496809176ac19d0727ac6b8cdc8603203216d9abb4e99814367357ec31";
const targetHash_6 = "d7181000a9f7587cd1f8737625de6093863d609855803ba16941b33e4fd24529";
const targetHash_5 = "e49449ebb75a365633ceb5e971779ec2f1b6e94048d1e9a4b1512432e85303a2";
const targetHash_4 = "d4c9df75385b7d3530bc5021d75dee751c73ae1952dc3fc50d3f288ba2622ad7";
const targetHash_3 = "bc5e7b05a3a3c2b3bc96c822727eae7fb6699683d11fc9c7b442320be9f26e9b";
const targetHash_Salych = "a91c8433f575011ebf6106ae13f243b2b295b6dfd318e8437a0ed2834b29a82b";

// pathputher
const secretFilePath_26 = "data_crypted_26";
const secretFilePath_23 = "data_crypted_23";
const secretFilePath_22 = "data_crypted_22";
const secretFilePath_21 = "data_crypted_21";
const secretFilePath_19 = "data_crypted_19";
const secretFilePath_18 = "data_crypted_18";
const secretFilePath_17 = "data_crypted_17";
const secretFilePath_16 = "data_crypted_16";
const secretFilePath_15 = "data_crypted_15";
const secretFilePath_14 = "data_crypted_14";
const secretFilePath_13 = "data_crypted_13";
const secretFilePath_12 = "data_crypted_12";
const secretFilePath_11 = "data_crypted_11";
const secretFilePath_10 = "data_crypted_10";
const secretFilePath_9 = "data_crypted_9";
const secretFilePath_8 = "data_crypted_8";
const secretFilePath_7 = "data_crypted_7";
const secretFilePath_6 = "data_crypted_6";
const secretFilePath_5 = "data_crypted_5";
const secretFilePath_4 = "data_crypted_4";
const secretFilePath_3 = "data_crypted_3";
const secretFilePath_Salych = "secret_text_Salych.txt";

async function decryptAESAsync(encryptedBase64, password) {
    // 1. Декодируем Base64 в массив байтов
    const binaryString = atob(encryptedBase64);
    const encryptedBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        encryptedBytes[i] = binaryString.charCodeAt(i);
    }

    // 2. Проверяем сигнатуру OpenSSL ('Salted__' = [83, 97, 108, 116, 101, 100, 95, 95])
    if (encryptedBytes.length < 16 || String.fromCharCode(...encryptedBytes.slice(0, 8)) !== 'Salted__') {
        throw new Error("Неверный формат данных: отсутствует сигнатура OpenSSL Salted__");
    }

    // 3. Извлекаем соль (байты 8-15) и чистый шифротекст (начиная с 16 байта)
    const salt = encryptedBytes.slice(8, 16);
    const ciphertext = encryptedBytes.slice(16);

    // 4. Импортируем текстовый пароль как сырой ключ для PBKDF2
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const baseKey = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );

    // 5. Генерируем 48 байт (32 байта для ключа AES-256 + 16 байт для IV) через PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 10000,
            hash: "SHA-256"
        },
        baseKey,
        384 // 48 байт * 8 бит
    );

    // 6. Разделяем полученные байты на Ключ и IV
    const keyBytes = derivedBits.slice(0, 32);
    const ivBytes = derivedBits.slice(32, 48);

    // 7. Импортируем итоговый ключ для алгоритма AES-CBC
    const aesKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-CBC" },
        false,
        ["decrypt"]
    );

    // 8. Расшифровываем данные
    const decryptedBuffer = await crypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: ivBytes
        },
        aesKey,
        ciphertext
    );

    // 9. Декодируем результат обратно в строку UTF-8
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
}

async function checkHash() {
    const inputVal = document.getElementById("numberInput").value;
    const resultDiv = document.getElementById("result");

    if (!inputVal) {
        alert("Пожалуйста, введите число");
        return;
    }

    try {
        // 1. Вычисляем SHA-256 с помощью Web Crypto API
        const msgBuffer = new TextEncoder().encode(inputVal);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // 2. Сравниваем с заданным хэшем
        if ("putin"==="") {
            // делать ничего. Еще один костыль для автоматизации внесения изменений в этот файл.
            }
// elseifputher
        else if (hashHex === targetHash_26) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_26);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_23) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_23);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_22) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_22);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_21) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_21);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_19) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_19);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_18) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_18);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_17) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_17);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_16) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_16);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_15) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_15);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_14) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_14);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_13) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_13);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_12) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_12);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_11) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_11);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_10) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_10);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_9) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_9);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_8) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_8);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_7) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_7);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_6) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_6);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_5) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_5);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_4) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_4);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_3) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_3);
            if (!response.ok) {
                throw new Error("fuck!");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else if (hashHex === targetHash_Salych) {
            // 3. Загружаем текст из файла на сервере
            const response = await fetch(secretFilePath_Salych);
            if (!response.ok) {
                throw new Error("Что-то тут сломалось. Я вас знаю, но помочь не могу. Вам повезло вызвать ошибку.");
            }
            const fileText = await response.text();
            const fileText_decrypt = await decryptAESAsync(fileText, inputVal)

            // Отображаем текст на странице
            resultDiv.innerHTML = `${fileText_decrypt}`;
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
        }
        else {
            resultDiv.innerHTML = "Я вас не знаю. Проходите мимо. А еще можете номер своей банковской карты с датой и cvv сюда отправить. Спасибо.";
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#f8d7da";
        }
    } catch (error) {
        console.error("Ошибка:", error);
        alert("Произошла ошибка при обработке");
    }
}
