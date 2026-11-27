import { Clock, CheckCircle, ChefHat } from 'lucide-react';

const orders = [
  {
    id: '#ORD-1024',
    table: 'Table 04',
    items: 'Chicken Biryani, Butter Naan',
    amount: '₹450',
    status: 'Completed',
    time: '10:30 AM',
  },
  {
    id: '#ORD-1023',
    table: 'Table 08',
    items: 'Paneer Butter Masala, Rice',
    amount: '₹380',
    status: 'Preparing',
    time: '10:25 AM',
  },
  {
    id: '#ORD-1022',
    table: 'Table 02',
    items: 'Veg Fried Rice, Fresh Lime',
    amount: '₹290',
    status: 'Pending',
    time: '10:18 AM',
  },
  {
    id: '#ORD-1021',
    table: 'Table 06',
    items: 'Masala Dosa, Filter Coffee',
    amount: '₹210',
    status: 'Completed',
    time: '10:10 AM',
  },
];

const statusConfig = {
  Completed: {
    className: 'completed',
    icon: CheckCircle,
  },
  Preparing: {
    className: 'preparing',
    icon: ChefHat,
  },
  Pending: {
    className: 'pending',
    icon: Clock,
  },
};

function RecentOrders() {
  return (
    <div className="recent-orders-card">
      <div className="section-card-header">
        <div>
          <h3>Recent Orders</h3>
          <p>Latest activity from your restaurant</p>
        </div>

        <span className="demo-label">Demo data</span>
      </div>

      <div className="orders-list">
        {orders.map((order) => {
          const status = statusConfig[order.status];
          const StatusIcon = status.icon;

          return (
            <div className="order-row" key={order.id}>
              <div className="order-main">
                <div className="order-id">{order.id}</div>
                <div className="order-details">
                  {order.table} · {order.items}
                </div>
                <div className="order-time">{order.time}</div>
              </div>

              <div className="order-side">
                <strong>{order.amount}</strong>

                <span className={`order-status ${status.className}`}>
                  <StatusIcon size={13} />
                  {order.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecentOrders;