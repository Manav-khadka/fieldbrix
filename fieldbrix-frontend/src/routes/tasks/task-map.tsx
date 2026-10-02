import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface TaskMapItem {
  id: string;
  number: string;
  externalReferenceId?: string;
  description: string;
  status: string;
  priority: string;
  latitude: number;
  longitude: number;
  customerName?: string;
  siteName?: string;
  coordinateSource?: "TASK" | "LOCATION";
}

const INDIA_BOUNDS = L.latLngBounds(L.latLng(6.4, 68.0), L.latLng(37.6, 97.5));
const CLUSTER_RADIUS_PX = 74;
const CLUSTER_EXPANSION_ZOOM = 17;

const STATUS_COLOURS: Record<string, string> = {
  DRAFT: "#82908d",
  SCHEDULED: "#346edb",
  ASSIGNED: "#6f4bc8",
  IN_PROGRESS: "#e18b22",
  COMPLETED: "#18876f",
  PAUSED: "#b76823",
  CANCELLED: "#b84949",
};

function markerIcon(status: string, count: number) {
  const colour = STATUS_COLOURS[status] ?? "#146f68";
  const cluster = count > 1;
  const size = cluster ? (count >= 1000 ? 52 : count >= 100 ? 46 : 40) : 28;
  return L.divIcon({
    className: "fb-task-map-marker-wrap",
    html: `<span class="fb-task-map-marker${cluster ? " is-cluster" : ""}" style="--marker-colour:${colour};--marker-size:${size}px">${cluster ? count.toLocaleString("en-IN") : ""}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

type TaskCluster = {
  tasks: TaskMapItem[];
  latitudeTotal: number;
  longitudeTotal: number;
};

function clusterTasks(map: L.Map, tasks: TaskMapItem[]) {
  const zoom = map.getZoom();
  const clusters = new Map<string, TaskCluster>();
  for (const task of tasks) {
    if (!Number.isFinite(task.latitude) || !Number.isFinite(task.longitude))
      continue;
    const projected = map.project([task.latitude, task.longitude], zoom);
    const key = `${Math.floor(projected.x / CLUSTER_RADIUS_PX)}:${Math.floor(projected.y / CLUSTER_RADIUS_PX)}`;
    const cluster = clusters.get(key) ?? {
      tasks: [],
      latitudeTotal: 0,
      longitudeTotal: 0,
    };
    cluster.tasks.push(task);
    cluster.latitudeTotal += task.latitude;
    cluster.longitudeTotal += task.longitude;
    clusters.set(key, cluster);
  }
  return [...clusters.values()];
}

function popupContent(tasks: TaskMapItem[]) {
  const root = document.createElement("div");
  root.className = "fb-task-map-popup";
  const heading = document.createElement("strong");
  heading.textContent = tasks[0].customerName || "Company task";
  root.append(heading);
  if (tasks[0].siteName) {
    const site = document.createElement("span");
    site.textContent = tasks[0].siteName;
    root.append(site);
  }
  for (const task of tasks.slice(0, 6)) {
    const link = document.createElement("a");
    link.href = `/tasks/${task.id}`;
    link.textContent = `${task.number} · ${task.description || task.externalReferenceId || "Field task"}`;
    root.append(link);
  }
  if (tasks.length > 6) {
    const more = document.createElement("small");
    more.textContent = `+ ${tasks.length - 6} more tasks at this location`;
    root.append(more);
  }
  return root;
}

export function TaskMap({ tasks }: { tasks: TaskMapItem[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [22.8, 79.0],
      zoom: 5,
      minZoom: 4,
      maxBounds: INDIA_BOUNDS.pad(0.22),
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    const bounds = L.latLngBounds([]);
    for (const task of tasks)
      if (Number.isFinite(task.latitude) && Number.isFinite(task.longitude))
        bounds.extend([task.latitude, task.longitude]);

    const renderClusters = () => {
      layer.clearLayers();
      for (const cluster of clusterTasks(map, tasks)) {
        const count = cluster.tasks.length;
        const first = cluster.tasks[0];
        const point = L.latLng(
          cluster.latitudeTotal / count,
          cluster.longitudeTotal / count,
        );
        const marker = L.marker(point, {
          icon: markerIcon(first.status, count),
          keyboard: true,
          title:
            count > 1
              ? `${count.toLocaleString("en-IN")} tasks · activate to zoom in`
              : `${first.number} · ${first.description || "Field task"}`,
        }).addTo(layer);

        if (count > 1 && map.getZoom() < CLUSTER_EXPANSION_ZOOM) {
          marker.on("click", () => {
            const clusterBounds = L.latLngBounds(
              cluster.tasks.map((task) => [task.latitude, task.longitude]),
            );
            const nextZoom = Math.min(
              CLUSTER_EXPANSION_ZOOM,
              Math.max(map.getZoom() + 2, map.getBoundsZoom(clusterBounds.pad(0.22))),
            );
            map.flyTo(point, nextZoom, { duration: 0.35 });
          });
        } else {
          marker.bindPopup(popupContent(cluster.tasks), { maxWidth: 340 });
        }
      }
    };

    map.on("zoomend", renderClusters);
    renderClusters();
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.18), { maxZoom: 12 });
    else map.fitBounds(INDIA_BOUNDS);
    return () => {
      map.off("zoomend", renderClusters);
      layer.clearLayers();
    };
  }, [tasks]);

  return (
    <div
      ref={containerRef}
      className="fb-task-map"
      role="application"
      aria-label={`India task map with ${tasks.length} plotted tasks`}
    />
  );
}
