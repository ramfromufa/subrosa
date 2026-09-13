// Да-да, этот код  жутко неоптимизирован.
// Я бы написал его гораздо лучше, короче и проще, даже являясь чайником Джава(Ява)Скрипта.
// Это всё один большой глиняный костыль на костыле костылем погоняет. Рекурсия ёбт.

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
        const foundItem = cryptoDataList.find(item => item.targetHash === hashHex);
        if (foundItem) {
            const fileText_decrypt = await decryptAESAsync(foundItem.secretFile, inputVal);

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
