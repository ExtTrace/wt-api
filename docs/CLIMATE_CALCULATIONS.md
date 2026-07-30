# Environmental & Climate Calculation Standards

Dokumen ini menjelaskan dasar teori, formula matematis, dan standar acuan ilmiah yang digunakan dalam perhitungan indikator kualitas udara pada aplikasi ini.

---

## 1. Dew Point (Titik Embun)
* **Fungsi:** `calculateDewPoint(temp, hum)`
* **Metode:** Persamaan Magnus-Tetens (Magnus-Tetens Formula).
* **Formula:**
  $$\alpha = \left( \frac{17.27 \times T}{237.7 + T} \right) + \ln\left(\frac{RH}{100}\right)$$
  $$\text{DewPoint} = \frac{237.7 \times \alpha}{17.27 - \alpha}$$
* **Standar Acuan:** WMO (World Meteorological Organization) & NOAA (Alduchov & Eskridge, 1996).

---

## 2. Mould Risk (Risiko Pertumbuhan Jamur)
* **Fungsi:** `calculateMouldRisk(temp, hum)`
* **Kondisi Trigger:** $RH \ge 65.0\%$ DAN $Temp \ge 23.0^\circ\text{C}$
* **Standar Acuan:**
  * **EPA (U.S. Environmental Protection Agency):** Kelembapan di atas 60-65% memicu perkembangbiakan spora jamur pada permukaan ruangan.
  * **WHO Indoor Air Quality Guidelines:** Kombinasi kelembapan $\ge 65\%$ dan suhu hangat $\ge 23^\circ\text{C}$ mempercepat pertumbuhan mikroorganisme (*Aspergillus*, *Penicillium*).

---

## 3. Room Comfort Status (Status Kenyamanan Ruangan Non-AC)
* **Fungsi:** `determineRoomStatus(temp, hum)`
* **Kategori & Ambang Batas:**
  * `LEMBAP / PENGAP`: $RH \ge 70.0\%$
  * `PANAS / GERAH`: $Temp \ge 30.0^\circ\text{C}$
  * `IDEAL / NYAMAN`: $Temp \text{ } 22-28^\circ\text{C}$ DAN $RH \text{ } 40-65\%$
  * `NORMAL`: Kondisi transisi di luar ambang batas ekstrem/ideal.
* **Standar Acuan:**
  * **ASHRAE Standard 55:** *Thermal Environmental Conditions for Human Occupancy* (Comfort envelope daerah bersuhu hangat/tropis).
  * **Permenkes RI No. 1077/MENKES/PER/V/2011:** Pedoman Penyehatan Udara Dalam Ruang Rumah.