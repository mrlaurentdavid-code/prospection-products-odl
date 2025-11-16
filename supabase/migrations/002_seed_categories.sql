-- ============================================
-- MIGRATION 002: Seed Categories and Subcategories
-- ============================================
-- Description: Insertion des 10 catégories principales + 65 sous-catégories
-- Author: Claude Code + Laurent David
-- Date: 2025-11-16
-- ============================================

-- ============================================
-- CATÉGORIES PRINCIPALES (10)
-- ============================================

INSERT INTO prospection.categories (id, name_en, name_fr, name_de, name_it) VALUES
(1, 'Foods & Beverages', 'Alimentation', 'Lebensmittel & Getränke', 'Alimentari & Bevande'),
(2, 'Beauty & Wellness', 'Beauté & Bien-être', 'Schönheit & Wellness', 'Bellezza & Benessere'),
(3, 'Home & Garden', 'Maison & Jardin', 'Haus & Garten', 'Casa & Giardino'),
(4, 'Fashion & Accessories', 'Mode & Accessoires', 'Mode & Accessoires', 'Moda & Accessori'),
(5, 'Sports & Leisure', 'Sports & Loisirs', 'Sport & Freizeit', 'Sport & Tempo Libero'),
(6, 'Electronics & Technology', 'Électronique & Technologie', 'Elektronik & Technologie', 'Elettronica & Tecnologia'),
(7, 'Kids & Babies', 'Enfants & Bébés', 'Kinder & Babys', 'Bambini & Neonati'),
(8, 'Auto & Moto', 'Auto & Moto', 'Auto & Motorrad', 'Auto & Moto'),
(9, 'Pets', 'Animaux', 'Haustiere', 'Animali'),
(10, 'Services & Experiences', 'Services & Expériences', 'Dienstleistungen & Erlebnisse', 'Servizi & Esperienze');

-- ============================================
-- SOUS-CATÉGORIES (65)
-- ============================================

-- 1. Foods & Beverages (7 sous-catégories)
INSERT INTO prospection.subcategories (category_id, name_en, name_fr, name_de, name_it) VALUES
(1, 'Organic Foods', 'Aliments biologiques', 'Bio-Lebensmittel', 'Alimenti biologici'),
(1, 'Beverages', 'Boissons', 'Getränke', 'Bevande'),
(1, 'Gourmet & Delicacies', 'Gastronomie & Délices', 'Gourmet & Delikatessen', 'Gastronomia & Prelibatezze'),
(1, 'Dietary Supplements', 'Compléments alimentaires', 'Nahrungsergänzungsmittel', 'Integratori alimentari'),
(1, 'Snacks & Sweets', 'Snacks & Sucreries', 'Snacks & Süßigkeiten', 'Snack & Dolci'),
(1, 'Coffee & Tea', 'Café & Thé', 'Kaffee & Tee', 'Caffè & Tè'),
(1, 'Alcoholic Beverages', 'Boissons alcoolisées', 'Alkoholische Getränke', 'Bevande alcoliche');

-- 2. Beauty & Wellness (8 sous-catégories)
INSERT INTO prospection.subcategories (category_id, name_en, name_fr, name_de, name_it) VALUES
(2, 'Skincare', 'Soins de la peau', 'Hautpflege', 'Cura della pelle'),
(2, 'Makeup', 'Maquillage', 'Make-up', 'Trucco'),
(2, 'Haircare', 'Soins capillaires', 'Haarpflege', 'Cura dei capelli'),
(2, 'Fragrances', 'Parfums', 'Düfte', 'Profumi'),
(2, 'Wellness & Spa', 'Bien-être & Spa', 'Wellness & Spa', 'Benessere & Spa'),
(2, 'Natural & Organic Cosmetics', 'Cosmétiques naturels', 'Natur- & Bio-Kosmetik', 'Cosmetici naturali'),
(2, 'Men''s Grooming', 'Soins pour hommes', 'Herrenpflege', 'Cura uomo'),
(2, 'Dental Care', 'Soins dentaires', 'Zahnpflege', 'Cura dentale');

-- 3. Home & Garden (9 sous-catégories)
INSERT INTO prospection.subcategories (category_id, name_en, name_fr, name_de, name_it) VALUES
(3, 'Furniture', 'Meubles', 'Möbel', 'Mobili'),
(3, 'Decoration', 'Décoration', 'Dekoration', 'Decorazione'),
(3, 'Kitchen & Dining', 'Cuisine & Salle à manger', 'Küche & Esszimmer', 'Cucina & Sala da pranzo'),
(3, 'Bedding & Textiles', 'Literie & Textiles', 'Bettwäsche & Textilien', 'Biancheria & Tessuti'),
(3, 'Lighting', 'Éclairage', 'Beleuchtung', 'Illuminazione'),
(3, 'Gardening & Outdoor', 'Jardinage & Extérieur', 'Garten & Outdoor', 'Giardinaggio & Esterno'),
(3, 'Storage & Organization', 'Rangement & Organisation', 'Aufbewahrung & Organisation', 'Archiviazione & Organizzazione'),
(3, 'Cleaning & Maintenance', 'Nettoyage & Entretien', 'Reinigung & Wartung', 'Pulizia & Manutenzione'),
(3, 'Smart Home', 'Maison connectée', 'Smart Home', 'Casa intelligente');

-- 4. Fashion & Accessories (8 sous-catégories)
INSERT INTO prospection.subcategories (category_id, name_en, name_fr, name_de, name_it) VALUES
(4, 'Women''s Fashion', 'Mode femme', 'Damenmode', 'Moda donna'),
(4, 'Men''s Fashion', 'Mode homme', 'Herrenmode', 'Moda uomo'),
(4, 'Shoes & Boots', 'Chaussures & Bottes', 'Schuhe & Stiefel', 'Scarpe & Stivali'),
(4, 'Bags & Luggage', 'Sacs & Bagages', 'Taschen & Gepäck', 'Borse & Valigie'),
(4, 'Jewelry & Watches', 'Bijoux & Montres', 'Schmuck & Uhren', 'Gioielli & Orologi'),
(4, 'Sunglasses & Eyewear', 'Lunettes de soleil', 'Sonnenbrillen', 'Occhiali da sole'),
(4, 'Sustainable Fashion', 'Mode durable', 'Nachhaltige Mode', 'Moda sostenibile'),
(4, 'Accessories', 'Accessoires', 'Accessoires', 'Accessori');

-- 5. Sports & Leisure (7 sous-catégories)
INSERT INTO prospection.subcategories (category_id, name_en, name_fr, name_de, name_it) VALUES
(5, 'Fitness & Gym', 'Fitness & Gym', 'Fitness & Gym', 'Fitness & Palestra'),
(5, 'Outdoor & Hiking', 'Outdoor & Randonnée', 'Outdoor & Wandern', 'Outdoor & Trekking'),
(5, 'Cycling', 'Cyclisme', 'Radsport', 'Ciclismo'),
(5, 'Water Sports', 'Sports nautiques', 'Wassersport', 'Sport acquatici'),
(5, 'Winter Sports', 'Sports d''hiver', 'Wintersport', 'Sport invernali'),
(5, 'Yoga & Wellness', 'Yoga & Bien-être', 'Yoga & Wellness', 'Yoga & Benessere'),
(5, 'Team Sports', 'Sports d''équipe', 'Mannschaftssport', 'Sport di squadra');

-- 6. Electronics & Technology (7 sous-catégories)
INSERT INTO prospection.subcategories (category_id, name_en, name_fr, name_de, name_it) VALUES
(6, 'Smartphones & Tablets', 'Smartphones & Tablettes', 'Smartphones & Tablets', 'Smartphone & Tablet'),
(6, 'Computers & Laptops', 'Ordinateurs & Portables', 'Computer & Laptops', 'Computer & Laptop'),
(6, 'Audio & Headphones', 'Audio & Casques', 'Audio & Kopfhörer', 'Audio & Cuffie'),
(6, 'Photo & Video', 'Photo & Vidéo', 'Foto & Video', 'Foto & Video'),
(6, 'Gaming', 'Gaming', 'Gaming', 'Gaming'),
(6, 'Wearables & Smart Devices', 'Objets connectés', 'Wearables & Smart Devices', 'Dispositivi indossabili'),
(6, 'Accessories & Cables', 'Accessoires & Câbles', 'Zubehör & Kabel', 'Accessori & Cavi');

-- 7. Kids & Babies (6 sous-catégories)
INSERT INTO prospection.subcategories (category_id, name_en, name_fr, name_de, name_it) VALUES
(7, 'Baby Care', 'Soins bébé', 'Babypflege', 'Cura del bambino'),
(7, 'Toys & Games', 'Jouets & Jeux', 'Spielzeug & Spiele', 'Giocattoli & Giochi'),
(7, 'Kids Fashion', 'Mode enfant', 'Kindermode', 'Moda bambino'),
(7, 'Baby Furniture', 'Meubles bébé', 'Babymöbel', 'Mobili per bambini'),
(7, 'Strollers & Car Seats', 'Poussettes & Sièges auto', 'Kinderwagen & Autositze', 'Passeggini & Seggiolini'),
(7, 'Educational Toys', 'Jouets éducatifs', 'Lernspielzeug', 'Giocattoli educativi');

-- 8. Auto & Moto (5 sous-catégories)
INSERT INTO prospection.subcategories (category_id, name_en, name_fr, name_de, name_it) VALUES
(8, 'Car Accessories', 'Accessoires auto', 'Auto-Zubehör', 'Accessori auto'),
(8, 'Motorcycle Gear', 'Équipement moto', 'Motorrad-Ausrüstung', 'Attrezzatura moto'),
(8, 'GPS & Navigation', 'GPS & Navigation', 'GPS & Navigation', 'GPS & Navigazione'),
(8, 'Car Care & Maintenance', 'Entretien auto', 'Autopflege', 'Cura dell''auto'),
(8, 'Electric Vehicles', 'Véhicules électriques', 'Elektrofahrzeuge', 'Veicoli elettrici');

-- 9. Pets (5 sous-catégories)
INSERT INTO prospection.subcategories (category_id, name_en, name_fr, name_de, name_it) VALUES
(9, 'Dog Supplies', 'Produits pour chiens', 'Hundeprodukte', 'Prodotti per cani'),
(9, 'Cat Supplies', 'Produits pour chats', 'Katzenprodukte', 'Prodotti per gatti'),
(9, 'Pet Food', 'Alimentation animaux', 'Tierfutter', 'Cibo per animali'),
(9, 'Pet Accessories', 'Accessoires animaux', 'Tierzubehör', 'Accessori per animali'),
(9, 'Pet Healthcare', 'Soins vétérinaires', 'Tierpflege', 'Cura degli animali');

-- 10. Services & Experiences (3 sous-catégories)
INSERT INTO prospection.subcategories (category_id, name_en, name_fr, name_de, name_it) VALUES
(10, 'Travel & Tourism', 'Voyage & Tourisme', 'Reisen & Tourismus', 'Viaggi & Turismo'),
(10, 'Events & Workshops', 'Événements & Ateliers', 'Veranstaltungen & Workshops', 'Eventi & Workshop'),
(10, 'Subscriptions & Memberships', 'Abonnements', 'Abonnements', 'Abbonamenti');

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Compter les catégories (doit être 10)
DO $$
DECLARE
  cat_count INTEGER;
  subcat_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cat_count FROM prospection.categories;
  SELECT COUNT(*) INTO subcat_count FROM prospection.subcategories;

  RAISE NOTICE 'Catégories insérées: %', cat_count;
  RAISE NOTICE 'Sous-catégories insérées: %', subcat_count;

  IF cat_count <> 10 THEN
    RAISE EXCEPTION 'Erreur: % catégories au lieu de 10', cat_count;
  END IF;

  IF subcat_count <> 65 THEN
    RAISE EXCEPTION 'Erreur: % sous-catégories au lieu de 65', subcat_count;
  END IF;
END $$;
