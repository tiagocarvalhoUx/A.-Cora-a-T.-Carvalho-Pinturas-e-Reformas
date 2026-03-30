const router = require('express').Router();

const SERVICES = [
  { id: 'internal', name: 'Pintura Interna', description: 'Pintura de ambientes internos com tinta de alta qualidade.', pricePerM2: 25, icon: 'home', color: '#2563EB', duration: '2-5 dias' },
  { id: 'external', name: 'Pintura Externa', description: 'Proteção e beleza para a fachada da sua casa.', pricePerM2: 35, icon: 'building', color: '#7C3AED', duration: '3-7 dias' },
  { id: 'texture', name: 'Textura e Grafiato', description: 'Acabamentos texturizados sofisticados para paredes.', pricePerM2: 45, icon: 'layers', color: '#D97706', duration: '3-6 dias' },
  { id: 'lacquering', name: 'Laqueação', description: 'Acabamento liso e brilhante para portas e móveis.', pricePerM2: 120, icon: 'sparkles', color: '#DC2626', duration: '5-10 dias' },
  { id: 'waterproofing', name: 'Impermeabilização', description: 'Proteção completa contra infiltrações e umidade.', pricePerM2: 55, icon: 'droplets', color: '#0891B2', duration: '2-4 dias' },
  { id: 'restoration', name: 'Restauração', description: 'Recuperação de pinturas antigas e superfícies danificadas.', pricePerM2: 40, icon: 'refresh', color: '#059669', duration: '3-7 dias' },
];

router.get('/', (req, res) => {
  res.json({ services: SERVICES });
});

router.get('/:id', (req, res) => {
  const service = SERVICES.find((s) => s.id === req.params.id);
  if (!service) return res.status(404).json({ message: 'Serviço não encontrado' });
  res.json({ service });
});

module.exports = router;
