'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseBrowser';
import { AuthPanel } from '../../components/AuthPanel';
import { Avatar } from '../../components/Avatar';

type BarberItem = {
  id: string;
  userId: string;
  name: string;
  tag: string;
  bio?: string | null;
  rating: number;
  photoUrl?: string | null;
  phone?: string | null;
  telegramChatId?: string | null;
  telegramEnabled?: boolean;
};

type Props = {
  initial: BarberItem[];
};

type ServiceOption = {
  id: string;
  name: string;
};

type CropTarget =
  | { type: 'new' }
  | { type: 'existing'; barberId: string; name: string };

const cropSize = 240;

export function BarberManager({ initial }: Props) {
  const [items, setItems] = useState<BarberItem[]>(initial);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [rating, setRating] = useState('4.7');
  const [linkEmail, setLinkEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [uploadingBarberId, setUploadingBarberId] = useState<string | null>(null);
  const [pendingCrop, setPendingCrop] = useState<{ file: File; target: CropTarget } | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropMeta, setCropMeta] = useState<{ width: number; height: number; baseScale: number } | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropDragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [barberServices, setBarberServices] = useState<Record<string, string[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editRating, setEditRating] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  useEffect(() => {
    const loadLocation = async () => {
      if (!supabaseBrowser) return;
      const { data } = await supabaseBrowser
        .from('locations')
        .select('id')
        .limit(1)
        .maybeSingle();
      setLocationId(data?.id ?? null);
    };
    loadLocation();
  }, []);

  const loadServices = async () => {
    if (!supabaseBrowser) return;
    const { data } = await supabaseBrowser
      .from('services')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name');
    if (!data) return;
    setServices(
      data.map((item) => ({
        id: item.id,
        name: item.name
      }))
    );
  };

  const loadBarberServices = async () => {
    if (!supabaseBrowser) return;
    const { data } = await supabaseBrowser
      .from('barber_services')
      .select('barber_id, service_id');
    if (!data) return;
    const map: Record<string, string[]> = {};
    data.forEach((row) => {
      if (!map[row.barber_id]) map[row.barber_id] = [];
      map[row.barber_id].push(row.service_id);
    });
    setBarberServices(map);
  };

  useEffect(() => {
    loadServices();
    loadBarberServices();
  }, []);

  const refresh = async () => {
    if (!supabaseBrowser) return;
    const { data } = await supabaseBrowser
      .from('barbers')
      .select('id, user_id, rating, bio, photo_url, telegram_chat_id, telegram_enabled, users(full_name, phone)')
      .eq('is_active', true);
    if (!data) return;
    setItems(
      data.map((item) => ({
        id: item.id,
        userId: item.user_id,
        name: item.users?.full_name ?? 'Мастер',
        tag: item.bio ?? 'Барбер',
        bio: item.bio ?? null,
        rating: item.rating ?? 4.7,
        photoUrl: item.photo_url,
        phone: item.users?.phone ?? '',
        telegramChatId: item.telegram_chat_id ?? '',
        telegramEnabled: item.telegram_enabled ?? false
      }))
    );
    await loadBarberServices();
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!pendingCrop) {
      setCropPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingCrop.file);
    setCropPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [pendingCrop]);

  useEffect(() => {
    if (!pendingCrop) return;
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setCropMeta(null);
  }, [pendingCrop]);

  const uploadPhoto = async (file: File | Blob, barberId?: string) => {
    if (!supabaseBrowser) return null;
    const contentType = file.type || 'image/jpeg';
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    const unique =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fileName = barberId ? `${barberId}.${extension}` : `${unique}.${extension}`;
    const path = `barbers/${fileName}`;
    const { error } = await supabaseBrowser.storage
      .from('barber-photos')
      .upload(path, file, { upsert: true, contentType, cacheControl: '3600' });
    if (error) {
      setStatus(error.message);
      return null;
    }
    const { data } = supabaseBrowser.storage.from('barber-photos').getPublicUrl(path);
    const cacheBuster = Date.now();
    return `${data.publicUrl}${data.publicUrl.includes('?') ? '&' : '?'}v=${cacheBuster}`;
  };

  const handleNewPhoto = (file: File) => {
    setPendingCrop({ file, target: { type: 'new' } });
  };

  const handleExistingPhoto = (barberId: string, name: string, file: File) => {
    setPendingCrop({ file, target: { type: 'existing', barberId, name } });
  };

  const updateBarberField = (
    barberId: string,
    key: 'telegramChatId' | 'telegramEnabled',
    value: string | boolean
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === barberId ? { ...item, [key]: value } : item
      )
    );
  };

  const toggleServiceForBarber = (barberId: string, serviceId: string) => {
    setBarberServices((prev) => {
      const current = new Set(prev[barberId] ?? []);
      if (current.has(serviceId)) {
        current.delete(serviceId);
      } else {
        current.add(serviceId);
      }
      return { ...prev, [barberId]: Array.from(current) };
    });
  };

  const saveServicesForBarber = async (barberId: string) => {
    if (!supabaseBrowser) return;
    setStatus(null);
    const selected = barberServices[barberId] ?? [];
    const { error: deleteError } = await supabaseBrowser
      .from('barber_services')
      .delete()
      .eq('barber_id', barberId);
    if (deleteError) {
      setStatus(deleteError.message);
      return;
    }
    if (selected.length > 0) {
      const { error: insertError } = await supabaseBrowser
        .from('barber_services')
        .insert(selected.map((serviceId) => ({
          barber_id: barberId,
          service_id: serviceId
        })));
      if (insertError) {
        setStatus(insertError.message);
        return;
      }
    }
    setStatus('Услуги мастера сохранены');
  };

  const startEdit = (item: BarberItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPhone(item.phone ?? '');
    setEditBio(item.bio ?? '');
    setEditRating(item.rating.toFixed(1));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPhone('');
    setEditBio('');
    setEditRating('');
  };

  const saveEdit = async (item: BarberItem) => {
    if (!supabaseBrowser) return;
    setStatus(null);
    if (!item.userId) {
      setStatus('Не найден пользователь мастера');
      return;
    }
    const ratingValue = Number(editRating);
    if (!editName || !ratingValue) {
      setStatus('Введите имя и рейтинг');
      return;
    }
    const { error: userError } = await supabaseBrowser
      .from('users')
      .update({
        full_name: editName,
        phone: editPhone.trim() ? editPhone.trim() : null
      })
      .eq('id', item.userId);
    if (userError) {
      setStatus(userError.message);
      return;
    }
    const { error: barberError } = await supabaseBrowser
      .from('barbers')
      .update({
        bio: editBio.trim() ? editBio.trim() : null,
        rating: ratingValue
      })
      .eq('id', item.id);
    if (barberError) {
      setStatus(barberError.message);
      return;
    }
    setStatus('Данные мастера обновлены');
    cancelEdit();
    refresh();
  };

  const saveBarberTelegram = async (item: BarberItem) => {
    if (!supabaseBrowser) return;
    setStatus(null);
    const { error } = await supabaseBrowser
      .from('barbers')
      .update({
        telegram_chat_id: item.telegramChatId || null,
        telegram_enabled: Boolean(item.telegramEnabled)
      })
      .eq('id', item.id);
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus('Настройки мастера сохранены');
    refresh();
  };

  const clampOffset = (offset: { x: number; y: number }, zoomValue = cropZoom) => {
    if (!cropMeta) return offset;
    const scale = cropMeta.baseScale * zoomValue;
    const scaledWidth = cropMeta.width * scale;
    const scaledHeight = cropMeta.height * scale;
    const maxOffsetX = Math.max(0, scaledWidth / 2 - cropSize / 2);
    const maxOffsetY = Math.max(0, scaledHeight / 2 - cropSize / 2);
    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y))
    };
  };

  useEffect(() => {
    if (!cropMeta) return;
    setCropOffset((prev) => clampOffset(prev));
  }, [cropMeta, cropZoom]);

  const handleCropConfirm = async () => {
    if (!pendingCrop || !cropMeta || !cropImageRef.current) return;
    const scale = cropMeta.baseScale * cropZoom;
    const sourceSize = cropSize / scale;
    const sx = (-cropSize / 2 - cropOffset.x) / scale + cropMeta.width / 2;
    const sy = (-cropSize / 2 - cropOffset.y) / scale + cropMeta.height / 2;
    const canvas = document.createElement('canvas');
    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.drawImage(
      cropImageRef.current,
      sx,
      sy,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.9)
    );
    if (!blob) {
      setStatus('Не удалось обработать фото');
      return;
    }

    let uploaded = false;
    if (pendingCrop.target.type === 'new') {
      setPhotoUploading(true);
      setStatus(null);
      const url = await uploadPhoto(blob);
      if (url) {
        setPhotoUrl(url);
        setStatus('Фото загружено');
        uploaded = true;
      }
      setPhotoUploading(false);
    } else {
      if (!supabaseBrowser) return;
      setUploadingBarberId(pendingCrop.target.barberId);
      setStatus(null);
      const url = await uploadPhoto(blob, pendingCrop.target.barberId);
      if (url) {
        const { error } = await supabaseBrowser
          .from('barbers')
          .update({ photo_url: url })
          .eq('id', pendingCrop.target.barberId);
        if (error) {
          setStatus(error.message);
        } else {
          setStatus('Фото мастера обновлено');
          await refresh();
          uploaded = true;
        }
      }
      setUploadingBarberId(null);
    }

    if (uploaded) {
      setPendingCrop(null);
    }
  };

  const handleCropCancel = () => {
    setPendingCrop(null);
  };

  const createBarber = async () => {
    if (!supabaseBrowser) return;
    setStatus(null);
    if (!fullName) {
      setStatus('Введите имя мастера');
      return;
    }
    if (!locationId) {
      setStatus('Не задана локация');
      return;
    }
    const { data: userData, error: userError } = await supabaseBrowser
      .from('users')
      .insert({ role: 'barber', full_name: fullName, phone })
      .select('id')
      .single();
    if (userError || !userData) {
      setStatus(userError?.message ?? 'Ошибка создания пользователя');
      return;
    }
    const { error: barberError } = await supabaseBrowser.from('barbers').insert({
      user_id: userData.id,
      location_id: locationId,
      bio,
      photo_url: photoUrl || null,
      rating: Number(rating) || 4.7,
      is_active: true,
      telegram_enabled: false,
      telegram_chat_id: null
    });
    if (barberError) {
      setStatus(barberError.message);
      return;
    }
    setFullName('');
    setPhone('');
    setBio('');
    setRating('4.7');
    setPhotoUrl('');
    await refresh();
    setStatus('Мастер добавлен');
  };

  const linkExistingUser = async () => {
    if (!supabaseBrowser) return;
    setStatus(null);
    if (!linkEmail) {
      setStatus('Введите email пользователя');
      return;
    }
    if (!locationId) {
      setStatus('Не задана локация');
      return;
    }
    const { data: userData, error: userError } = await supabaseBrowser
      .from('users')
      .select('id')
      .eq('email', linkEmail)
      .single();
    if (userError || !userData) {
      setStatus('Пользователь не найден');
      return;
    }
    const { error: roleError } = await supabaseBrowser
      .from('users')
      .update({ role: 'barber' })
      .eq('id', userData.id);
    if (roleError) {
      setStatus(roleError.message);
      return;
    }
    const { data: existingBarber } = await supabaseBrowser
      .from('barbers')
      .select('id')
      .eq('user_id', userData.id)
      .maybeSingle();
    if (!existingBarber) {
      const { error: barberError } = await supabaseBrowser.from('barbers').insert({
        user_id: userData.id,
        location_id: locationId,
        bio,
        photo_url: photoUrl || null,
        rating: Number(rating) || 4.7,
        is_active: true,
        telegram_enabled: false,
        telegram_chat_id: null
      });
      if (barberError) {
        setStatus(barberError.message);
        return;
      }
    }
    setLinkEmail('');
    setPhotoUrl('');
    await refresh();
    setStatus('Пользователь привязан как мастер');
  };

  if (!supabaseBrowser) {
    return <AuthPanel />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <strong>Добавить мастера</strong>
        <input
          style={inputStyle}
          placeholder="ФИО"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Телефон"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Описание"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Фото мастера"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid #e6d2be'
              }}
            />
          ) : (
            <Avatar name={fullName || 'Мастер'} />
          )}
          <label className="button secondary" style={{ margin: 0 }}>
            {photoUploading ? 'Загрузка...' : 'Загрузить фото'}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleNewPhoto(file);
                }
                event.currentTarget.value = '';
              }}
              disabled={photoUploading}
            />
          </label>
        </div>
        <input
          style={inputStyle}
          placeholder="Рейтинг"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        />
        <button className="button" onClick={createBarber}>
          Добавить
        </button>
        {status ? <p>{status}</p> : null}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <strong>Привязать существующего пользователя</strong>
        <input
          style={inputStyle}
          placeholder="Email пользователя"
          value={linkEmail}
          onChange={(e) => setLinkEmail(e.target.value)}
        />
        <button className="button secondary" onClick={linkExistingUser}>
          Привязать как мастера
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <strong>Список мастеров</strong>
        {items.map((item) => (
          <div key={item.id} className="list-item" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {item.photoUrl ? (
                <img
                  src={item.photoUrl}
                  alt={item.name}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid #e6d2be'
                  }}
                />
              ) : (
                <Avatar name={item.name} />
              )}
              <div>
                <strong>{item.name}</strong>
                <p>{item.tag}</p>
                {item.phone ? <p>{item.phone}</p> : null}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="chip">{item.rating.toFixed(1)}</span>
                <label className="button secondary" style={{ margin: 0 }}>
                  {uploadingBarberId === item.id ? 'Загрузка...' : 'Обновить фото'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleExistingPhoto(item.id, item.name, file);
                      }
                      event.currentTarget.value = '';
                    }}
                    disabled={uploadingBarberId === item.id}
                  />
                </label>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 12, color: '#8b6f5d' }}>
                  Telegram chat_id мастера
                </label>
                <input
                  style={inputStyle}
                  placeholder="chat_id мастера"
                  value={item.telegramChatId ?? ''}
                  onChange={(e) => updateBarberField(item.id, 'telegramChatId', e.target.value)}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(item.telegramEnabled)}
                    onChange={(e) => updateBarberField(item.id, 'telegramEnabled', e.target.checked)}
                  />
                  <span>Отправлять уведомления мастеру</span>
                </label>
                <button
                  className="button secondary"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => saveBarberTelegram(item)}
                >
                  Сохранить Telegram
                </button>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 12, color: '#8b6f5d' }}>
                  Данные мастера
                </label>
                {editingId === item.id ? (
                  <>
                    <input
                      style={inputStyle}
                      placeholder="Имя"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <input
                      style={inputStyle}
                      placeholder="Телефон"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                    <input
                      style={inputStyle}
                      placeholder="Описание"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                    />
                    <input
                      style={inputStyle}
                      placeholder="Рейтинг"
                      value={editRating}
                      onChange={(e) => setEditRating(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="button secondary"
                        onClick={() => saveEdit(item)}
                      >
                        Сохранить
                      </button>
                      <button className="button secondary" onClick={cancelEdit}>
                        Отмена
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    className="button secondary"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => startEdit(item)}
                  >
                    Редактировать
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 12, color: '#8b6f5d' }}>
                  Услуги мастера
                </label>
                <div style={{ display: 'grid', gap: 6 }}>
                  {services.map((service) => (
                    <label key={service.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={(barberServices[item.id] ?? []).includes(service.id)}
                        onChange={() => toggleServiceForBarber(item.id, service.id)}
                      />
                      <span>{service.name}</span>
                    </label>
                  ))}
                </div>
                <button
                  className="button secondary"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => saveServicesForBarber(item.id)}
                >
                  Сохранить услуги
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pendingCrop ? (
        <div className="card cropper">
          <strong>Обрезать фото</strong>
          <p>
            {pendingCrop.target.type === 'new'
              ? 'Фото для нового мастера'
              : `Фото для ${pendingCrop.target.name}`}
          </p>
          <div className="cropper-body">
            <div
              className="cropper-frame"
              onPointerDown={(event) => {
                if (!cropMeta) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                cropDragRef.current = {
                  startX: event.clientX,
                  startY: event.clientY,
                  originX: cropOffset.x,
                  originY: cropOffset.y
                };
              }}
              onPointerMove={(event) => {
                if (!cropDragRef.current) return;
                const deltaX = event.clientX - cropDragRef.current.startX;
                const deltaY = event.clientY - cropDragRef.current.startY;
                setCropOffset(
                  clampOffset({
                    x: cropDragRef.current.originX + deltaX,
                    y: cropDragRef.current.originY + deltaY
                  })
                );
              }}
              onPointerUp={(event) => {
                cropDragRef.current = null;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }}
              onPointerLeave={() => {
                cropDragRef.current = null;
              }}
            >
              {cropPreviewUrl ? (
                <img
                  ref={cropImageRef}
                  src={cropPreviewUrl}
                  alt="Предпросмотр"
                  className="cropper-image"
                  onLoad={(event) => {
                    const img = event.currentTarget;
                    const baseScale = Math.max(cropSize / img.naturalWidth, cropSize / img.naturalHeight);
                    setCropMeta({ width: img.naturalWidth, height: img.naturalHeight, baseScale });
                  }}
                  style={{
                    transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropMeta ? cropMeta.baseScale * cropZoom : 1})`
                  }}
                />
              ) : null}
            </div>
            <div className="cropper-controls">
              <label style={{ fontSize: 12, color: '#8b6f5d' }}>Масштаб</label>
              <input
                type="range"
                min={1}
                max={2.5}
                step={0.05}
                value={cropZoom}
                onChange={(event) => setCropZoom(Number(event.target.value))}
              />
              <div className="cropper-actions">
                <button className="button" onClick={handleCropConfirm}>
                  Использовать фото
                </button>
                <button className="button secondary" onClick={handleCropCancel}>
                  Отмена
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setCropZoom(1);
                    setCropOffset({ x: 0, y: 0 });
                  }}
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #e6d2be',
  background: '#fff',
  fontSize: 14
};
