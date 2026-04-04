@echo off
curl "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.dynformexecutedynformfrontend?6ad31bfb-b163-4717-9652-50117f874938,50,225178,1737227" ^
  -H "Cookie: GX_CLIENT_ID=0cd6ff24-9751-486a-9fbe-09b121dc1f43; GX_SESSION_ID=3%%2BwjMmKDMjPcKjnUUW%%2FQ8A75Tn9pO%%2BKppSrsyDmLQuc%%3D; ROUTEID=.dgrd-prod-app2.dgr.gub.uy; JSESSIONID=\"0iVIpFLJfAxg8j6VcCRS88-OoSkXxpmGO2G6zOyd.dgrd-prod-app2.dgr.gub.uy:tramites_frontend2\"; GxTZOffset=America/Montevideo" ^
  -H "User-Agent: Mozilla/5.0" ^
  -o dgr_form_page.html
