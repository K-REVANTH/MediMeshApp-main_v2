{{/* MediMesh — Parent Chart Global Helpers */}}

{{/* Chart name */}}
{{- define "medimesh.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Fully qualified app name */}}
{{- define "medimesh.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s" .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/* Chart label */}}
{{- define "medimesh.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Common labels */}}
{{- define "medimesh.labels" -}}
helm.sh/chart: {{ include "medimesh.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: medimesh
{{- end }}

{{/* MongoDB connection string helper */}}
{{- define "medimesh.mongoUri" -}}
{{- $dbNs := .Values.global.namespaces.db -}}
{{- $mongo := .Values.global.mongo -}}
{{- $replicas := int $mongo.replicas -}}
{{- $hosts := list -}}
{{- range $i := until $replicas -}}
{{- $hosts = append $hosts (printf "%s-%d.%s.%s.svc.cluster.local:%d" $mongo.host $i $mongo.host $dbNs (int $mongo.port)) -}}
{{- end -}}
mongodb://{{ join "," $hosts }}/{{ .dbName }}?replicaSet={{ $mongo.replicaSet }}
{{- end }}
