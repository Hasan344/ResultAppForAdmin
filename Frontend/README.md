# ResultsApp — İmtahan Komissiya Nəticələri

İmtahan komissiyalarının (62, 63, 6401, 152) idman üzrə qabiliyyət imtahanlarını
yönətmək, abituriyent dataları import etmək, sonuçları toplamak və komissiya
bazlı "məqbul/qeyri-məqbul" raporları çıxarmaq üçün tasarlanmış sistem.

## Mimari

- **Backend:** ASP.NET Core 8 Web API + EF Core 8 + SQL Server
- **Frontend:** React 18 + Vite 5 + TypeScript + Tailwind 3
- **DB:** İki ayrı DB
  - `ForQab` (mövcud prod DB) — toxunulmaz, salt-oxunan
  - `ResultsApp` (yeni) — students, results, scoring_rules və s. burada saxlanır

### DB təcridi (synonym layer)

ResultsApp, ForQab cədvəllərinə **synonym** vasitəsilə bağlanır. Synonym = "alias";
EF Core tərəfdən normal cədvəl kimi görünür, lakin əslində ForQab DB-sindəki
cədvələ baxır. Eyni SQL instance-da olduqları üçün cross-DB JOIN performansı normal.

```
[ ForQab.dbo.exams           ]    [ ResultsApp.dbo.students       ]
[ ForQab.dbo.commissions     ]◄───[ ResultsApp.dbo.scoring_rules  ]
[ ForQab.dbo.Exam_Commissions]    [ ResultsApp.dbo.exercises      ]
[ ForQab.dbo.experts         ]    [ ResultsApp.dbo.import_batches ]
[ ForQab.dbo.monitors        ]    [ ResultsApp.dbo.student_exam_results ]
[ ...                        ]
         ▲                                    ▲
         │ SYNONYM                            │
         └───── ResultsApp.dbo.exams ─────────┘
                ResultsApp.dbo.commissions
                (alias-lar burada)
```

**Niyə synonym?** Aşağıdakı sahələrdə view-dan üstündür:
- EF normal cədvəl kimi görür (HasNoKey lazım deyil)
- İndekslər ForQab tərəfində aktivdir
- Yenidən compile olunmur, hər query-də əlavə layer yox

**Cross-DB FK YOXDUR** (SQL Server icazə vermir). `students.exam_id`,
`student_exam_results.exam_id` və `import_batches.exam_id` sahələri integer-dir;
referensial integrity application səviyyəsində ImportService/ScoringService
tərəfindən təmin olunur.

## Quraşdırma

### 1) DB

```sh
# ResultsApp DB-ni yarat və ForQab synonym-larını əlavə et
sqlcmd -S localhost -i sql/00_create_resultsapp_db.sql

# Yeni cədvəlləri yarat
sqlcmd -S localhost -d ResultsApp -i sql/01_new_tables.sql

# Bal cədvəllərini seed et
sqlcmd -S localhost -d ResultsApp -i sql/02_seed_scoring_rules.sql
```

**(Opsional, lakin tövsiyə olunur)** ResultsApp istifadəçisinə ForQab cədvəllərinə
yalnız SELECT icazəsi verin — `00_create_resultsapp_db.sql` faylının sonundakı
GRANT/DENY blokuna baxın.

### 2) Backend

```sh
cd backend/ForQab.Api
# appsettings.json içindəki ConnectionString-i (ResultsApp) düzənlə
dotnet restore
dotnet run         # → http://localhost:5000  (Swagger: /swagger)
```

### 3) Frontend

```sh
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

## ÖNƏMLİ: EF Migrations istifadə etmə

EF migration `dotnet ef migrations add` mexanizmi synonym-ları **görmür**.
Yəni "exams" cədvəlinin "yox olduğunu" zənn edib `CREATE TABLE` kimi əmrlər
üretə bilər. Buna görə **migration istifadə etmə** — sxema dəyişiklikləri üçün
yalnız əl ilə SQL skriptləri yaz (sql/ qovluğunda davam etdir).

Skripti versiyalamaq üçün adlandırma konvensiyası:
```
sql/00_create_resultsapp_db.sql        ← bu mövcuddur
sql/01_new_tables.sql                  ← bu mövcuddur
sql/02_seed_scoring_rules.sql          ← bu mövcuddur
sql/03_<növbəti dəyişiklik>.sql        ← gələcəkdə
```

## Akış

### A) Excel Import
1. **Imports** sayfasında komissiya + tarix seç, `.xlsx` yüklə
2. Backend `Exam_Commissions` (synonym) üzərindən o tarixdəki müvafiq `exam_id`-ni tapır
3. `ResultsApp.students` cədvəlinə bulk insert; duplicate `is_n` skip edilir
4. `ResultsApp.import_batches`-ə audit log yazılır

### B) Sonuç Girişi
- **Tək tək:** `POST /api/results` — `ScoringService` avtomatik bal hesablayır
- **Toplu:** `POST /api/results/bulk` — başqa sistemdən gələn JSON üçün
- **Override:** `finalScoreOverride` parametri ilə expert manuel bal qoya bilər
- **Recalculate:** Bal cədvəli dəyişərsə `POST /api/results/recalculate/{examId}`

### C) Komissiya Sonuç Sayfası
- **Commissions** sayfasında komissiya + sınav + (opsional) qrup seç
- Tablo: hər hareket üçün ham dəyər + bal, total + Məqbul/Qeyri-məqbul badge
- Threshold: ≥ 24 → Məqbul

### D) Bal Cədvəlləri (Admin)
- Komissiya/cins/yaş/hareket bazlı filtrelama
- Inline edit + soft delete (`is_active = 0`)

## ScoringService Logic

```
if (refused || rawValue == null) → 0
if (exercise.unit == "score")    → rawValue itself (gymnastics, sport_games)
else:
  rules = scoring_rules
    .where(commission, kodixtisas, exercise, gender, ageInRange, isActive)
    .orderByDesc(score)        ← try 10 first, then 9, ...
  for each rule:
    if direction==1 (saniyə):  rawValue <= threshold → return rule.score
    if direction==2 (sm/dəfə): rawValue >= threshold → return rule.score
  return 0
```

**Yaş hesabı:** `examDate - birthDate` (full years, doğum günü keçdi yoxlaması ilə).

**Subspecialty:** 62-ci komissiya 3 alt-ixtisasa ayrılır (UFH/ABT/KSI). 
`students.alt_nov` sahəsindən gəlir və `scoring_rules.kodixtisas` ilə match olur. 
`kodixtisas IS NULL` → bütün alt-ixtisaslara tətbiq olunur (63, 6401, 152 üçün).

## API Endpoint'ləri

| Method | Path | Açıqlama |
|---|---|---|
| GET | `/api/exams` | İmtahanları listələ (filter: commissionNo, from, to, sectionId) |
| GET | `/api/exams/{id}` | İmtahan detayı |
| GET | `/api/exams/{id}/experts` | İmtahandakı ekspertlər |
| GET | `/api/exams/{id}/monitors` | İmtahandakı nəzarətçilər |
| GET | `/api/exams/{id}/representatives` | İmtahandakı nümayəndələr |
| GET | `/api/students?examId=&qrupNum=` | Tələbələri listələ |
| PATCH | `/api/students/{id}/attendance` | İştirakı qeyd et |
| POST | `/api/imports/students` | Excel ilə tələbələri import et |
| POST | `/api/results` | Tək nəticə əlavə et/yenilə |
| POST | `/api/results/bulk` | Toplu nəticə import |
| POST | `/api/results/recalculate/{examId}` | Bütün balları yenidən hesabla |
| GET | `/api/results/by-student/{studentId}` | Tələbənin bütün nəticələri |
| GET | `/api/commissions` | Komissiya siyahısı |
| GET | `/api/commissions/{no}/results?examId=&qrupNum=` | Komissiya sonuç tablosu |
| GET/POST/PUT/DELETE | `/api/scoringrules` | Bal cədvəli CRUD |
| GET | `/api/lookup/{sections,genders,exercises,commissions}` | Lookup data |

## Notlar

- **Authorization** şu an yox. Production öncesi mövcud `AspNetUsers` ilə JWT Bearer əlavə et.
- **CORS** yalnız `http://localhost:{5173,3000}`-ə icazəlidir — `appsettings.json`-da configure et.
- **Excel limiti** 20 MB.
- **Subspecialty kodları (UFH/ABT/KSI):** Excel-də `alt nov` sütunundan gəlir. 
  Excel-dəki dəyər seed-dəki ilə eyni olmalıdır. Excel-də "Ümumi fiziki hazırlıq" 
  yazıyorsa ya import sırasında map et ya da seed-i yenilə. **Test etmədən production-a 
  açma.**
- **Exam_Commissions link:** Import-un işləməsi üçün hər sınavın ForQab-da 
  `Exam_Commissions` cədvəlindəki ilgili komissiyaya bağlı olması lazımdır.
- **Cross-DB FK yox:** Schema migration etdikdə `students`-də exam_id orphan ola bilər;
  ForQab-da exam silinsə də ResultsApp-də student qalır (bu ümumiyyətlə istənən
  davranışdır — audit data).
