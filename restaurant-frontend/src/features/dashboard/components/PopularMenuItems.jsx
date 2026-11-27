const popularItems = [
  {
    name: 'Chicken Biryani',
    category: 'Main Course',
    orders: 86,
    revenue: '₹21,500',
    percentage: 90,
  },
  {
    name: 'Paneer Butter Masala',
    category: 'Main Course',
    orders: 64,
    revenue: '₹16,000',
    percentage: 70,
  },
  {
    name: 'Masala Dosa',
    category: 'South Indian',
    orders: 52,
    revenue: '₹7,800',
    percentage: 55,
  },
  {
    name: 'Veg Fried Rice',
    category: 'Chinese',
    orders: 38,
    revenue: '₹6,840',
    percentage: 40,
  },
];

function PopularMenuItems() {
  return (
    <div className="popular-items-card">
      <div className="section-card-header">
        <div>
          <h3>Popular Menu Items</h3>
          <p>Best-performing dishes this week</p>
        </div>

        <span className="demo-label">Demo data</span>
      </div>

      <div className="popular-items-list">
        {popularItems.map((item, index) => (
          <div className="popular-item" key={item.name}>
            <div className="popular-item-info">
              <div className="popular-item-rank">
                {index + 1}
              </div>

              <div className="popular-item-details">
                <strong>{item.name}</strong>
                <span>{item.category} · {item.orders} orders</span>
              </div>
            </div>

            <div className="popular-item-performance">
              <strong>{item.revenue}</strong>
              <div className="performance-track">
                <div
                  className="performance-fill"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PopularMenuItems;