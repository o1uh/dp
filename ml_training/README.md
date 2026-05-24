# Окружение обучения ML (Fine-Tuning HT-Demucs v4)

Данная директория содержит инфраструктуру, утилиты автоматизации и патчи для дообучения модели Meta Demucs v4 на извлечение 5-го стема (**Гитара**). Окружение полностью адаптировано под запуск на ОС Windows с использованием видеокарт NVIDIA (на примере малых мощностей видеокарты, примерно 8GB VRAM).

---

## 1. Развертывание и патчинг ядра Demucs

Если вы разворачиваете репозиторий заново, выполните следующие шаги:

1.  Клонируйте оригинальный репозиторий Demucs v4 в эту папку:
    ```bash
    git clone https://github.com/facebookresearch/demucs.git
    # Удалите папку .git внутри склонированного demucs, чтобы избежать конфликтов субмодулей
    rm -rf demucs/.git
    ```
2.  **Замена пропатченных файлов:**
    Скопируйте с заменой все файлы из этой директории репозитория в склонированную папку `demucs/`:
    *   `ml_training/demucs/demucs/solver.py` $\rightarrow$ `demucs/demucs/solver.py` (Патч безопасности PyTorch 2.6 `weights_only=False`)
    *   `ml_training/demucs/demucs/wav.py` $\rightarrow$ `demucs/demucs/wav.py` (Патч `soundfile` вместо `torchaudio` + фиксация `self.shift = 5` для оптимизации скорости в 5 раз)
    *   `ml_training/demucs/demucs/audio.py` $\rightarrow$ `demucs/demucs/audio.py` (Патч записи через `soundfile`)
    *   `ml_training/demucs/demucs/evaluate.py` $\rightarrow$ `demucs/demucs/evaluate.py` (Обход ошибки `MUSDB_PATH`)
    *   `ml_training/demucs/demucs/train.py` $\rightarrow$ `demucs/demucs/train.py` (Обход импортов оценки)
    *   `ml_training/demucs/requirements.txt` $\rightarrow$ `demucs/requirements.txt`
    *   `ml_training/demucs/conf/config_guitar.yaml` $\rightarrow$ `demucs/conf/config_guitar.yaml`

---

## 2. Обязательный патч библиотеки Dora (Ограничение Windows)

Для обхода ошибки `WinError 183` (невозможность перезаписи `history.json` методом `os.rename` в Windows) необходимо вручную заменить системный метод в установленной библиотеке Dora:

1.  Откройте файл вашего Python-окружения:
    `C:\Users\<Ваш_Пользователь>\AppData\Local\Programs\Python\Python312\Lib\site-packages\dora\utils.py`
2.  Найдите строку ~57 внутри функции `write_and_rename`:
    ```python
    os.rename(tmp_path, path)
    ```
3.  Замените её на кроссплатформенный метод:
    ```python
    os.replace(tmp_path, path)
    ```

---

## 3. Подготовка данных

### Вариант А: Быстрый тест окружения (Синтетические данные)
1.  Сгенерируйте тестовые синусоиды:
    ```bash
    python generate_dummy_dataset.py
    ```
2.  Сгенерируйте отладочный кэш-манифест:
    ```bash
    python generate_demucs_manifest.py
    ```

### Вариант Б: Продакшн-обучение (MoisesDB)
1.  Убедитесь, что MoisesDB распакован на HDD по пути, указанному в `assemble_moisesdb.py` (`MOISES_ROOT`).
2.  Запустите сборщик (он отберет треки с гитарой, сведет их на SSD в папки `train` (90) и `valid` (10)):
    ```bash
    python assemble_moisesdb.py
    ```
3.  Сгенерируйте манифест:
    ```bash
    python generate_demucs_manifest.py
    ```

---

## 4. Запуск процесса обучения

Перейдите в папку `demucs/` и выполните команду:

```bash
dora run model=htdemucs epochs=100 batch_size=4 augment.repitch.proba=0 weights=[1,1] test.every=99999
```

*   **Пауза:** `Ctrl + C` в окне терминала.
*   **Продолжение:** Запуск той же команды (автоматический подхват из `outputs/xps/1800cc58/checkpoint.th`).
*   **Результат:** Лучшие веса для бэкенда (`best.th`) будут находиться в `demucs/outputs/xps/1800cc58/`.