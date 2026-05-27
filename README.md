# GTS
> Track every garment, every step

This is a mobile-first application designed for tracking the movement of garment samples between employees and departments.

## Tech Stack
* **Frontend**: React Native + Expo
* **Backend**: Node.js + Express.js
* **Database**: MariaDB / MySQL

## Setup Instructions

### 1. Database Setup
1. Ensure MariaDB (or MySQL) is installed and running on your system (e.g., using XAMPP or native installation).
2. Open your database management tool (phpMyAdmin, MySQL Workbench, or CLI).
3. Run the SQL script provided in `backend/init.sql`. This will create the `garment_tracking` database, create all required tables, and insert some dummy employees.

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Check the `.env` file and make sure the `DB_USER` and `DB_PASSWORD` match your local MariaDB credentials. By default, it uses `root` and an empty password.
3. Start the backend server:
   ```bash
   npm run start
   ```
   *Note: If you have `nodemon` installed globally, you can use `nodemon server.js` for auto-reloading.*

### 3. Frontend Setup
1. Open a new terminal and navigate to the `mobile` folder:
   ```bash
   cd mobile
   ```
2. If testing on a physical device using Expo Go, make sure your mobile device and PC are on the same Wi-Fi network. Update the `BASE_URL` in `mobile/src/utils/api.ts` to your PC's IP address (e.g., `http://192.168.x.x:5000/api`). If using an Android Emulator, the default `http://10.0.2.2:5000/api` will work.
3. Start the Expo server:
   ```bash
   npx expo start
   ```
4. Scan the QR code using the Expo Go app on your Android device to launch the app.

## MVP Flow
1. **Login**: Use the mock login screen (credentials: admin / password).
2. **Dashboard**: View high-level metrics.
3. **Employee Master**: View or add new employees.
4. **Sample Master**: Add a new sample to be tracked.
5. **Sample Handover**: Transfer a sample to another employee. Notice how the department auto-fills upon selecting an employee.
6. **Live Tracking**: See the real-time status and current holder of all samples.
7. **Timeline History**: Tap on any sample in the Tracking screen to see its complete movement history.
