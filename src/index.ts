import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { json, urlencoded } from 'express';
import { setupSwagger } from './config/swagger';
import userRouter from './routes/userRoutes';
import companyRouter from './routes/companyRoutes';
import adminRouter from './routes/adminRoutes';
import warehouseRouter from './routes/warehouseRoutes';
import transferRouter from './routes/transferRoutes';
import inventoryRouter from './routes/inventoryRoutes';
import orderRouter from './routes/orderRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Register Swagger UI
setupSwagger(app);

// Routes
app.use('/api/users', userRouter);
app.use('/api/companies', companyRouter);
app.use('/api/admin', adminRouter);
app.use('/api/warehouse', warehouseRouter);

// New Module Routes
app.use('/api/transfers', transferRouter);
app.use('/transfers', transferRouter);

app.use('/api/inventory', inventoryRouter);
app.use('/inventory', inventoryRouter);

app.use('/api/orders', orderRouter);
app.use('/orders', orderRouter);

app.get('/', (req, res) => {
  res.send('Prisma Express API is running');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
