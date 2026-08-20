"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useId, useState } from "react";
import {
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  GripVertical,
  Images,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhotoLightbox } from "@/components/photos/photo-lightbox";
import {
  deleteAdminMedia,
  fetchAdminMedia,
  restoreAdminMedia,
  updateMediaOrder,
} from "@/lib/media/client";
import type { PhotoMetadata } from "@/lib/storage/types";

type AdminMode = "delete" | "order";
type MultiMovePhase = "off" | "select" | "place";

export function PhotoAdmin() {
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [mode, setMode] = useState<AdminMode>("delete");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMetadata | null>(null);
  const [activeMoveId, setActiveMoveId] = useState<string | null>(null);
  const [multiMovePhase, setMultiMovePhase] = useState<MultiMovePhase>("off");
  const [selectedMoveIds, setSelectedMoveIds] = useState<Set<string>>(() => new Set());
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [movePosition, setMovePosition] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [lastDeletedIds, setLastDeletedIds] = useState<string[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadPhotos = useCallback(async (token: string) => {
    const data = await fetchAdminMedia(token);
    setPhotos(data.photos);
    setIsReadOnly(Boolean(data.readOnly));
    setSelectedIds(new Set());
    setSelectedPhoto(null);
    setActiveMoveId(null);
    setMultiMovePhase("off");
    setSelectedMoveIds(new Set());
    setMoveTargetId(null);
    setMovePosition("");
    setIsDirty(false);
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      await loadPhotos(password);
      setAdminToken(password);
      setPassword("");
    } catch (loginError) {
      setError(errorMessage(loginError));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setNotice(null);
  };

  const changeMode = (nextMode: AdminMode) => {
    if (nextMode === mode) return;
    if (isDirty) {
      setError("Lagre rekkefølgen før du går over til sletting.");
      return;
    }
    setError(null);
    setNotice(null);
    setSelectedIds(new Set());
    setActiveMoveId(null);
    setMultiMovePhase("off");
    setSelectedMoveIds(new Set());
    setMoveTargetId(null);
    setMovePosition("");
    setMode(nextMode);
  };

  const movePhoto = (id: string, requestedIndex: number) => {
    const fromIndex = photos.findIndex((photo) => photo.id === id);
    if (fromIndex < 0) return;
    const toIndex = Math.max(0, Math.min(requestedIndex, photos.length - 1));
    if (fromIndex === toIndex) return;

    const next = [...photos];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setPhotos(next);
    setIsDirty(true);
    setNotice(null);
    if (activeMoveId === id) setMovePosition(String(toIndex + 1));
  };

  const movePhotoGroup = (requestedIndex: number) => {
    const movingPhotos = photos.filter((photo) => selectedMoveIds.has(photo.id));
    if (movingPhotos.length === 0) return;

    const remainingPhotos = photos.filter((photo) => !selectedMoveIds.has(photo.id));
    const toIndex = Math.max(0, Math.min(requestedIndex, remainingPhotos.length));
    const next = [...remainingPhotos];
    next.splice(toIndex, 0, ...movingPhotos);

    const changed = next.some((photo, index) => photo.id !== photos[index]?.id);
    if (changed) {
      setPhotos(next);
      setIsDirty(true);
      setNotice(null);
    }
    setMovePosition(String(toIndex + 1));
  };

  const chooseMovePhoto = (id: string) => {
    const index = photos.findIndex((photo) => photo.id === id);
    setActiveMoveId(id);
    setMoveTargetId(null);
    setMovePosition(index >= 0 ? String(index + 1) : "");
    setError(null);
  };

  const startMultiMove = () => {
    setSelectedMoveIds(activeMoveId ? new Set([activeMoveId]) : new Set());
    setMultiMovePhase("select");
    setActiveMoveId(null);
    setMoveTargetId(null);
    setMovePosition("");
    setError(null);
    setNotice(null);
  };

  const toggleMoveSelected = (id: string) => {
    setSelectedMoveIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
    setNotice(null);
  };

  const continueMultiMove = () => {
    if (selectedMoveIds.size === 0) {
      setError("Marker minst ett bilde som skal flyttes.");
      return;
    }
    const firstSelectedIndex = photos.findIndex((photo) => selectedMoveIds.has(photo.id));
    setMultiMovePhase("place");
    setMoveTargetId(null);
    setMovePosition(firstSelectedIndex >= 0 ? String(firstSelectedIndex + 1) : "");
    setError(null);
  };

  const editMultiSelection = () => {
    setMultiMovePhase("select");
    setMoveTargetId(null);
    setError(null);
  };

  const chooseMoveTarget = (id: string) => {
    if (multiMovePhase === "select") {
      toggleMoveSelected(id);
      return;
    }
    if (multiMovePhase === "place") {
      if (selectedMoveIds.has(id)) return;
      setMoveTargetId(id);
      setError(null);
      return;
    }
    if (!activeMoveId) {
      chooseMovePhoto(id);
      return;
    }
    if (id === activeMoveId) return;
    setMoveTargetId(id);
    setError(null);
  };

  const cancelMove = () => {
    setActiveMoveId(null);
    setMultiMovePhase("off");
    setSelectedMoveIds(new Set());
    setMoveTargetId(null);
    setMovePosition("");
    setError(null);
  };

  const moveAroundTarget = (placement: "before" | "after") => {
    if (multiMovePhase === "place") {
      if (!moveTargetId || selectedMoveIds.has(moveTargetId)) return;
      const remainingPhotos = photos.filter((photo) => !selectedMoveIds.has(photo.id));
      const targetIndex = remainingPhotos.findIndex((photo) => photo.id === moveTargetId);
      if (targetIndex < 0) return;
      movePhotoGroup(targetIndex + (placement === "after" ? 1 : 0));
      setMoveTargetId(null);
      setError(null);
      return;
    }
    if (!activeMoveId || !moveTargetId) return;

    const sourceIndex = photos.findIndex((photo) => photo.id === activeMoveId);
    if (sourceIndex < 0) return;

    const next = [...photos];
    const [moved] = next.splice(sourceIndex, 1);
    const targetIndex = next.findIndex((photo) => photo.id === moveTargetId);
    if (targetIndex < 0) return;

    const insertIndex = targetIndex + (placement === "after" ? 1 : 0);
    if (insertIndex === sourceIndex) {
      setMovePosition(String(sourceIndex + 1));
      setMoveTargetId(null);
      return;
    }
    next.splice(insertIndex, 0, moved);
    setPhotos(next);
    setMovePosition(String(insertIndex + 1));
    setMoveTargetId(null);
    setIsDirty(true);
    setError(null);
    setNotice(null);
  };

  const parseMovePosition = (maxPosition = photos.length) => {
    const position = Number.parseInt(movePosition, 10);
    if (!Number.isFinite(position) || position < 1 || position > maxPosition) {
      setError(`Velg en plassering mellom 1 og ${maxPosition}.`);
      return null;
    }
    setError(null);
    return position;
  };

  const jumpToEnteredPosition = () => {
    const maxPosition = multiMovePhase === "place"
      ? photos.length - selectedMoveIds.size + 1
      : photos.length;
    const position = parseMovePosition(maxPosition);
    if (position === null) return;
    document.getElementById(`admin-photo-${position}`)?.scrollIntoView({
      behavior: "auto",
      block: "center",
    });
  };

  const moveToEnteredPosition = () => {
    const maxPosition = multiMovePhase === "place"
      ? photos.length - selectedMoveIds.size + 1
      : photos.length;
    const position = parseMovePosition(maxPosition);
    if (position === null) return;
    if (multiMovePhase === "place") {
      movePhotoGroup(position - 1);
    } else if (activeMoveId) {
      movePhoto(activeMoveId, position - 1);
    } else {
      return;
    }
    setMovePosition(String(position));
    setMoveTargetId(null);
  };

  const handleSaveOrder = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await updateMediaOrder(adminToken, photos.map((photo) => photo.id));
      setIsDirty(false);
      setNotice(
        result.dryRun
          ? "Test fullført. Rekkefølgen ble ikke skrevet til det ekte albumet."
          : "Ny rekkefølge er lagret."
      );
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const label = ids.length === 1 ? "dette bildet" : `disse ${ids.length} bildene`;
    if (!window.confirm(`Vil du fjerne ${label} fra albumet? Du kan angre etterpå.`)) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await deleteAdminMedia(adminToken, ids);
      setPhotos((current) => current.filter((photo) => !selectedIds.has(photo.id)));
      setSelectedPhoto(null);
      setSelectedIds(new Set());
      setLastDeletedIds(ids);
      setNotice(
        result.dryRun
          ? `${ids.length === 1 ? "Bildet ble" : `${ids.length} bilder ble`} skjult i testvisningen. Ingen ekte albumdata ble endret.`
          : `${ids.length === 1 ? "Bildet er" : `${ids.length} bilder er`} fjernet. Samle-ZIP-en må bygges på nytt.`
      );
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (lastDeletedIds.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      await restoreAdminMedia(adminToken, lastDeletedIds);
      await loadPhotos(adminToken);
      setLastDeletedIds([]);
      setNotice("Slettingen er angret.");
    } catch (restoreError) {
      setError(errorMessage(restoreError));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAdminToken("");
    setPassword("");
    setPhotos([]);
    setSelectedIds(new Set());
    setSelectedPhoto(null);
    setLastDeletedIds([]);
    setIsReadOnly(false);
    setIsDirty(false);
    setActiveMoveId(null);
    setMultiMovePhase("off");
    setSelectedMoveIds(new Set());
    setMoveTargetId(null);
    setMovePosition("");
    setError(null);
    setNotice(null);
  };

  const activeMoveIds = multiMovePhase === "place"
    ? photos.filter((photo) => selectedMoveIds.has(photo.id)).map((photo) => photo.id)
    : activeMoveId
      ? [activeMoveId]
      : [];
  const maxMovePosition = multiMovePhase === "place"
    ? photos.length - selectedMoveIds.size + 1
    : photos.length;

  if (!adminToken) {
    return (
      <AdminShell>
        <div className="mx-auto mt-12 max-w-md rounded-2xl border border-[#E8DED0] bg-white/90 p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8DED0] text-[#5D4E37]">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-semibold text-[#5D4E37]">Administrer albumet</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#8B7355]">
            Logg inn for å velge bilder som skal fjernes eller endre rekkefølgen i albumet.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-[#5D4E37]">
                Administratorpassord
              </label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                disabled={isLoading}
              />
            </div>
            {error && <StatusMessage tone="error">{error}</StatusMessage>}
            <Button type="submit" className="w-full" disabled={isLoading || !password.trim()}>
              {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              Åpne administrasjon
            </Button>
          </form>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell onLogout={logout}>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#5D4E37]">Administrer albumet</h1>
        <p className="mt-1 text-sm text-[#8B7355]">{photos.length} bilder og videoer i albumet</p>
      </div>

      {isReadOnly && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">Testmodus:</strong> Du kan prøve hele flyten, men sletting og ny rekkefølge lagres ikke i det ekte albumet.
        </div>
      )}

      <div className="sticky top-[69px] z-30 -mx-4 mb-5 border-y border-[#E8DED0] bg-[#F5F0EB]/95 px-4 py-3 shadow-sm backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[#D8C9B7] bg-white p-1">
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${mode === "delete" ? "bg-[#5D4E37] text-white" : "text-[#6D5B45] hover:bg-[#F5F0EB]"}`}
              onClick={() => changeMode("delete")}
            >
              Velg og slett
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${mode === "order" ? "bg-[#5D4E37] text-white" : "text-[#6D5B45] hover:bg-[#F5F0EB]"}`}
              onClick={() => changeMode("order")}
            >
              Endre rekkefølge
            </button>
          </div>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {mode === "delete" ? (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={selectedIds.size === 0 || isLoading}
              >
                {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Slett valgte{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={multiMovePhase === "off" ? startMultiMove : editMultiSelection}
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4" />
                  {multiMovePhase === "off" ? "Marker flere" : `Valgt (${selectedMoveIds.size})`}
                </Button>
                <Button onClick={handleSaveOrder} disabled={!isDirty || isLoading}>
                  {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Lagre rekkefølge
                </Button>
              </>
            )}
          </div>
        </div>

        {mode === "order" && multiMovePhase === "select" && (
          <MultiSelectControls
            className="mt-3 hidden border-t border-[#E8DED0] pt-3 sm:flex"
            selectedCount={selectedMoveIds.size}
            onContinue={continueMultiMove}
            onCancel={cancelMove}
          />
        )}

        {mode === "order" && activeMoveIds.length > 0 && (
          <MoveControls
            className="mt-3 hidden border-t border-[#E8DED0] pt-3 sm:flex"
            photos={photos}
            activeMoveIds={activeMoveIds}
            moveTargetId={moveTargetId}
            movePosition={movePosition}
            maxMovePosition={maxMovePosition}
            onMovePositionChange={setMovePosition}
            onJump={jumpToEnteredPosition}
            onMoveToPosition={moveToEnteredPosition}
            onPlaceBefore={() => moveAroundTarget("before")}
            onPlaceAfter={() => moveAroundTarget("after")}
            onEditSelection={multiMovePhase === "place" ? editMultiSelection : undefined}
            onCancel={cancelMove}
          />
        )}
      </div>

      {mode === "delete" ? (
        <p className="mb-4 text-sm text-[#8B7355]">Trykk på bilder for å markere dem. Bruk øyet for å se et bilde i full størrelse.</p>
      ) : (
        <p className="mb-4 text-sm text-[#8B7355]">
          {multiMovePhase === "select"
            ? "Trykk på alle bildene du vil flytte samlet. De beholder rekkefølgen seg imellom."
            : multiMovePhase === "place"
              ? "Skriv inn startplasseringen, eller trykk på et annet bilde og plasser gruppen før eller etter."
              : activeMoveId
                ? "Finn stedet i albumet og trykk på et annet bilde. Velg deretter om bildet skal plasseres før eller etter."
                : "Trykk på ett bilde for å flytte det, eller bruk «Marker flere» for å flytte en hel gruppe."}
        </p>
      )}

      {error && <div className="mb-4"><StatusMessage tone="error">{error}</StatusMessage></div>}
      {notice && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StatusMessage tone="success">{notice}</StatusMessage>
          {lastDeletedIds.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleRestore} disabled={isLoading}>
              <RotateCcw className="h-4 w-4" />
              Angre sletting
            </Button>
          )}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D8C9B7] py-16 text-center text-[#8B7355]">
          <Images className="mx-auto mb-3 h-8 w-8" />
          Albumet er tomt
        </div>
      ) : (
        <div className={`grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 ${mode === "order" && (activeMoveId || multiMovePhase !== "off") ? "pb-56 sm:pb-0" : ""}`}>
          {photos.map((photo, index) => (
            <AdminPhotoTile
              key={photo.id}
              photo={photo}
              index={index}
              mode={mode}
              isSelected={selectedIds.has(photo.id)}
              isMoveActive={activeMoveId === photo.id}
              isMultiSelecting={multiMovePhase === "select"}
              isMultiSelected={selectedMoveIds.has(photo.id)}
              isMoveTarget={moveTargetId === photo.id}
              isDragging={draggedId === photo.id}
              canDrag={multiMovePhase === "off"}
              onToggle={() => toggleSelected(photo.id)}
              onPreview={() => setSelectedPhoto(photo)}
              onChooseMove={() => chooseMoveTarget(photo.id)}
              onMovePrevious={() => movePhoto(photo.id, index - 1)}
              onMoveNext={() => movePhoto(photo.id, index + 1)}
              onDragStart={() => setDraggedId(photo.id)}
              onDragEnd={() => setDraggedId(null)}
              onDrop={() => {
                if (draggedId) movePhoto(draggedId, index);
                setDraggedId(null);
              }}
            />
          ))}
        </div>
      )}

      {mode === "order" && multiMovePhase === "select" && (
        <MultiSelectControls
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#D8C9B7] bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(93,78,55,0.14)] backdrop-blur sm:hidden"
          selectedCount={selectedMoveIds.size}
          onContinue={continueMultiMove}
          onCancel={cancelMove}
        />
      )}

      {mode === "order" && activeMoveIds.length > 0 && (
        <MoveControls
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#D8C9B7] bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(93,78,55,0.14)] backdrop-blur sm:hidden"
          photos={photos}
          activeMoveIds={activeMoveIds}
          moveTargetId={moveTargetId}
          movePosition={movePosition}
          maxMovePosition={maxMovePosition}
          onMovePositionChange={setMovePosition}
          onJump={jumpToEnteredPosition}
          onMoveToPosition={moveToEnteredPosition}
          onPlaceBefore={() => moveAroundTarget("before")}
          onPlaceAfter={() => moveAroundTarget("after")}
          onEditSelection={multiMovePhase === "place" ? editMultiSelection : undefined}
          onCancel={cancelMove}
        />
      )}

      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={photos}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={setSelectedPhoto}
        />
      )}
    </AdminShell>
  );
}

function AdminPhotoTile({
  photo,
  index,
  mode,
  isSelected,
  isMoveActive,
  isMultiSelecting,
  isMultiSelected,
  isMoveTarget,
  isDragging,
  canDrag,
  onToggle,
  onPreview,
  onChooseMove,
  onMovePrevious,
  onMoveNext,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  photo: PhotoMetadata;
  index: number;
  mode: AdminMode;
  isSelected: boolean;
  isMoveActive: boolean;
  isMultiSelecting: boolean;
  isMultiSelected: boolean;
  isMoveTarget: boolean;
  isDragging: boolean;
  canDrag: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onChooseMove: () => void;
  onMovePrevious: () => void;
  onMoveNext: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const isVideo = photo.mediaType === "video";
  return (
    <div
      id={`admin-photo-${index + 1}`}
      className={`group relative overflow-hidden rounded-lg border-2 bg-[#E8DED0] transition [contain-intrinsic-size:0_120px] [content-visibility:auto] ${isSelected || isMoveActive || isMultiSelected ? "border-[#5D4E37] ring-2 ring-[#5D4E37]/20" : isMoveTarget ? "border-amber-500 ring-2 ring-amber-400/30" : "border-transparent"} ${isDragging ? "opacity-40" : "opacity-100"}`}
      draggable={mode === "order" && canDrag}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (mode === "order" && canDrag) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <button
        type="button"
        className="relative block aspect-square w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D4E37]"
        onClick={mode === "delete" ? onToggle : onChooseMove}
        aria-pressed={mode === "delete" ? isSelected : isMultiSelecting || isMultiSelected ? isMultiSelected : isMoveActive}
        aria-label={mode === "delete"
          ? `Velg bilde ${index + 1}`
          : isMultiSelecting
            ? `${isMultiSelected ? "Fjern markering av" : "Marker"} bilde ${index + 1}`
            : isMultiSelected
              ? `Valgt bilde ${index + 1}`
            : `Velg bilde ${index + 1} for flytting`}
      >
        <img
          src={photo.thumbnailUrl || photo.url}
          alt={isVideo ? `Video nummer ${index + 1}` : `Bilde nummer ${index + 1}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <span className="absolute left-1.5 top-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-xs font-semibold text-white">
          {index + 1}
        </span>
        {mode === "delete" && (
          <span className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 text-white ${isSelected ? "border-white bg-[#5D4E37]" : "border-white/90 bg-black/35"}`}>
            {isSelected && <Check className="h-4 w-4" />}
          </span>
        )}
        {mode === "order" && !isMultiSelecting && !isMultiSelected && (
          <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white">
            <GripVertical className="h-4 w-4" />
          </span>
        )}
        {mode === "order" && (isMultiSelecting || isMultiSelected) && (
          <span className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 text-white ${isMultiSelected ? "border-white bg-[#5D4E37]" : "border-white/90 bg-black/35"}`}>
            {isMultiSelected && <Check className="h-4 w-4" />}
          </span>
        )}
        {mode === "order" && isMoveActive && !isMultiSelected && (
          <span className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-[#5D4E37]/90 px-1.5 py-1 text-center text-[11px] font-semibold text-white sm:hidden">
            Flyttes
          </span>
        )}
        {mode === "order" && isMoveTarget && (
          <span className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-amber-500/95 px-1.5 py-1 text-center text-[11px] font-semibold text-white">
            Nytt sted
          </span>
        )}
        {mode === "order" && isMultiSelected && (
          <span className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-[#5D4E37]/90 px-1.5 py-1 text-center text-[11px] font-semibold text-white">
            Valgt
          </span>
        )}
      </button>

      <button
        type="button"
        className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white shadow hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        onClick={onPreview}
        aria-label={`Vis ${isVideo ? "video" : "bilde"} ${index + 1} stort`}
      >
        <Eye className="h-4 w-4" />
      </button>

      {mode === "order" && isMoveActive && !isMultiSelected && (
        <div className="absolute inset-x-1.5 bottom-1.5 left-1.5 hidden w-fit gap-1 rounded-full bg-black/65 p-0.5 sm:flex">
          <button type="button" className="flex h-7 w-7 items-center justify-center rounded-full text-white disabled:opacity-30" onClick={onMovePrevious} disabled={index === 0} aria-label="Flytt én plass bakover">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className="flex h-7 w-7 items-center justify-center rounded-full text-white disabled:opacity-30" onClick={onMoveNext} aria-label="Flytt én plass fremover">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function MoveControls({
  className,
  photos,
  activeMoveIds,
  moveTargetId,
  movePosition,
  maxMovePosition,
  onMovePositionChange,
  onJump,
  onMoveToPosition,
  onPlaceBefore,
  onPlaceAfter,
  onEditSelection,
  onCancel,
}: {
  className: string;
  photos: PhotoMetadata[];
  activeMoveIds: string[];
  moveTargetId: string | null;
  movePosition: string;
  maxMovePosition: number;
  onMovePositionChange: (value: string) => void;
  onJump: () => void;
  onMoveToPosition: () => void;
  onPlaceBefore: () => void;
  onPlaceAfter: () => void;
  onEditSelection?: () => void;
  onCancel: () => void;
}) {
  const movePositionId = useId();
  const movePositionCountId = useId();
  const activeIndex = photos.findIndex((photo) => photo.id === activeMoveIds[0]);
  const targetIndex = moveTargetId ? photos.findIndex((photo) => photo.id === moveTargetId) : -1;
  const activePhoto = activeIndex >= 0 ? photos[activeIndex] : null;
  const isGroupMove = activeMoveIds.length > 1 || Boolean(onEditSelection);

  if (!activePhoto) return null;

  return (
    <div className={`${className} flex-col gap-3`} aria-label={isGroupMove ? "Kontroller for flytting av flere bilder" : "Kontroller for flytting av bilde"}>
      <div className="flex items-center gap-3">
        <img
          src={activePhoto.thumbnailUrl || activePhoto.url}
          alt={isGroupMove ? "Første bilde i gruppen som flyttes" : "Bildet som flyttes"}
          className="h-12 w-12 shrink-0 rounded-lg object-cover ring-2 ring-[#5D4E37]/20"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#5D4E37]">
            {isGroupMove ? `Flytter ${activeMoveIds.length} bilder` : `Flytter bilde ${activeIndex + 1}`}
          </p>
          <p className="text-xs text-[#8B7355]">
            {targetIndex >= 0
              ? `Nytt sted ved bilde ${targetIndex + 1}`
              : isGroupMove
                ? "Rekkefølgen mellom de valgte bildene beholdes"
                : "Trykk på et bilde som skal være ved siden av"}
          </p>
        </div>
        {onEditSelection && (
          <Button type="button" variant="ghost" size="sm" onClick={onEditSelection}>
            Endre utvalg
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="Avbryt flytting">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {targetIndex >= 0 ? (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onPlaceBefore}>
            <ArrowUpToLine className="h-4 w-4" />
            Plasser før
          </Button>
          <Button type="button" onClick={onPlaceAfter}>
            <ArrowDownToLine className="h-4 w-4" />
            Plasser etter
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor={movePositionId} className="mb-1 block text-xs font-medium text-[#6D5B45]">
              {isGroupMove ? "Startplassering" : "Plassering"}
            </label>
            <Input
              id={movePositionId}
              type="number"
              inputMode="numeric"
              min={1}
              max={maxMovePosition}
              value={movePosition}
              onChange={(event) => onMovePositionChange(event.target.value)}
              className="h-10"
              aria-describedby={movePositionCountId}
            />
          </div>
          <span id={movePositionCountId} className="pb-3 text-xs text-[#8B7355]">av {maxMovePosition}</span>
          <Button type="button" variant="outline" onClick={onJump}>Hopp</Button>
          <Button type="button" onClick={onMoveToPosition}>Flytt hit</Button>
        </div>
      )}
    </div>
  );
}

function MultiSelectControls({
  className,
  selectedCount,
  onContinue,
  onCancel,
}: {
  className: string;
  selectedCount: number;
  onContinue: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={`${className} flex-col gap-3`} aria-label="Velg flere bilder som skal flyttes">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8DED0] text-[#5D4E37]">
          <Check className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#5D4E37]">
            {selectedCount === 0 ? "Marker bildene" : `${selectedCount} ${selectedCount === 1 ? "bilde valgt" : "bilder valgt"}`}
          </p>
          <p className="text-xs text-[#8B7355]">Trykk på bildene som skal flyttes samlet</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="Avbryt flervalg">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Button type="button" onClick={onContinue} disabled={selectedCount === 0}>
        Velg plassering
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AdminShell({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#F5F0EB] via-white to-[#F5F0EB]">
      <header className="sticky top-0 z-40 border-b border-[#E8DED0]/70 bg-white/95 shadow-sm backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
            <Link href="/photos">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Til galleriet</span>
            </Link>
          </Button>
          <span className="text-xl font-medium tracking-wider text-[#5D4E37] sm:text-2xl">Silje & Sindre</span>
          {onLogout ? (
            <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logg ut</span>
            </Button>
          ) : <div className="w-10 sm:w-20" />}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</div>
    </main>
  );
}

function StatusMessage({ children, tone }: { children: React.ReactNode; tone: "error" | "success" }) {
  return (
    <p className={`rounded-lg px-3 py-2 text-sm ${tone === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
      {children}
    </p>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Noe gikk galt";
}
